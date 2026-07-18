"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { scanForContactInfo } from "@/lib/utils/contact-guard"

// Flag het gesprek én beide partijen wanneer iemand contactgegevens deelt.
// Gebruikt de service-role omdat we ook het profiel van de tegenpartij bijwerken.
async function flagConversation(
  conversationId: string,
  senderId: string,
  body: string,
  reasons: string[],
) {
  const admin = createAdminClient()

  const { data: conv } = await admin
    .from("conversations")
    .select("id, booker_id, artists(user_id)")
    .eq("id", conversationId)
    .maybeSingle()
  if (!conv) return

  const artistUserId =
    (conv.artists as { user_id: string | null } | null)?.user_id ?? null
  const counterpartyId =
    senderId === conv.booker_id ? artistUserId : conv.booker_id

  const reason = reasons.join(", ")

  await admin
    .from("conversations")
    .update({
      flagged: true,
      flag_reason: reason,
      flagged_at: new Date().toISOString(),
    })
    .eq("id", conversationId)

  await admin.from("chat_flags").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    counterparty_id: counterpartyId,
    reason,
    snippet: body.slice(0, 300),
  })

  // Verhoog flag_count en markeer beide profielen als geflagd.
  const ids = [senderId, counterpartyId].filter(Boolean) as string[]
  const { data: profs } = await admin
    .from("profiles")
    .select("id, flag_count")
    .in("id", ids)

  await Promise.all(
    (profs ?? []).map((p) =>
      admin
        .from("profiles")
        .update({ flagged: true, flag_count: (p.flag_count ?? 0) + 1 })
        .eq("id", p.id),
    ),
  )
}

// Markeer inkomende berichten als gelezen en ververs de ongelezen-badge in de
// zijbalk (die in de layout zit en niet vanzelf her-rendert bij navigatie).
export async function markConversationRead(conversationId: string) {
  if (!conversationId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Verifieer via de RLS-beschermde SELECT dat de gebruiker deelnemer is:
  // alleen deelnemers kunnen dit gesprek überhaupt ophalen.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle()
  if (!conv) return

  // read_at bijwerken via de service-role: op messages bestaat geen UPDATE-
  // RLS-policy, dus een gewone client zou hier 0 rijen bijwerken.
  const admin = createAdminClient()
  const { data: updated } = await admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("read_at", null)
    .neq("sender_id", user.id)
    .select("id")

  // Alleen verversen als er echt iets is bijgewerkt (voorkomt onnodige renders).
  if (updated && updated.length > 0) {
    revalidatePath("/messages")
    revalidatePath("/", "layout")
  }
}

export async function sendMessage(formData: FormData) {
  const conversationId = String(formData.get("conversation_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!conversationId || !body) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // MyGigs blijft exclusief: contactgegevens delen wordt geblokkeerd én geflagd.
  const scan = scanForContactInfo(body)
  if (scan.flagged) {
    await flagConversation(conversationId, user.id, body, scan.reasons)
    redirect(`/messages/${conversationId}?warn=contact`)
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  })

  revalidatePath(`/messages/${conversationId}`)
}
