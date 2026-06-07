"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function sendMessage(formData: FormData) {
  const conversationId = String(formData.get("conversation_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!conversationId || !body) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  })

  revalidatePath(`/messages/${conversationId}`)
}

// De artiest doet een bod (bedrag + datum) direct in het gesprek.
export async function sendOffer(formData: FormData) {
  const conversationId = String(formData.get("conversation_id") ?? "")
  const amount = Math.round(Number(formData.get("amount") ?? 0))
  const eventDate = String(formData.get("event_date") ?? "")
  if (!conversationId || amount <= 0 || !eventDate) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, artists(user_id)")
    .eq("id", conversationId)
    .maybeSingle()
  if (!conv) return

  const artist = conv.artists as { user_id: string } | null
  // Alleen de artiest van dit gesprek mag een bod uitbrengen.
  if (artist?.user_id !== user.id) return

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: "Bod uitgebracht",
    offer_amount: amount,
    offer_event_date: eventDate,
    offer_status: "pending",
  })

  revalidatePath(`/messages/${conversationId}`)
}

// De boeker accepteert of wijst een bod af. Acceptatie maakt of werkt een
// boeking bij.
export async function respondToOffer(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "")
  const decision = String(formData.get("decision") ?? "")
  if (!messageId || (decision !== "accept" && decision !== "decline")) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: msg } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, offer_amount, offer_event_date, offer_status, conversations(artist_id, booker_id, booking_id)",
    )
    .eq("id", messageId)
    .maybeSingle()
  if (!msg || msg.offer_status !== "pending") return

  const conv = msg.conversations as {
    artist_id: string
    booker_id: string
    booking_id: string | null
  } | null
  if (!conv) return
  // Alleen de boeker mag op een bod reageren.
  if (conv.booker_id !== user.id) return

  const conversationId = msg.conversation_id

  if (decision === "decline") {
    await supabase
      .from("messages")
      .update({ offer_status: "declined" })
      .eq("id", messageId)
    revalidatePath(`/messages/${conversationId}`)
    return
  }

  const amount = msg.offer_amount ?? 0
  const eventDate = msg.offer_event_date
  if (amount <= 0 || !eventDate) return

  if (conv.booking_id) {
    await supabase
      .from("bookings")
      .update({
        status: "accepted",
        event_date: eventDate,
        gage: amount,
        service_fee: 0,
        total: amount,
      })
      .eq("id", conv.booking_id)
  } else {
    const { data: booking } = await supabase
      .from("bookings")
      .insert({
        artist_id: conv.artist_id,
        booker_id: conv.booker_id,
        event_date: eventDate,
        gage: amount,
        service_fee: 0,
        total: amount,
        status: "accepted",
      })
      .select("id")
      .maybeSingle()
    if (booking) {
      await supabase
        .from("conversations")
        .update({ booking_id: booking.id })
        .eq("id", conversationId)
    }
  }

  await supabase
    .from("messages")
    .update({ offer_status: "accepted" })
    .eq("id", messageId)

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath("/bookings")
}
