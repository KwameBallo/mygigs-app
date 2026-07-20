"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Een organisator vraagt aan om DJ te worden. De aanvraag komt op 'pending';
// een beheerder keurt goed/af. Zelf-goedkeuring is niet mogelijk (rol staat vast).
export async function applyForDj(formData: FormData) {
  const motivation = String(formData.get("motivation") ?? "").trim() || null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/dj-aanvraag")

  // Al DJ? Dan naar het profiel.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role === "artist" || profile?.role === "both") redirect("/profile")

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("dj_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing?.status === "approved") redirect("/profile")

  if (existing) {
    // Opnieuw indienen na afwijzing: reset naar 'pending'.
    await admin
      .from("dj_applications")
      .update({
        status: "pending",
        motivation,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
  } else {
    await admin
      .from("dj_applications")
      .insert({ user_id: user.id, motivation, status: "pending" })
  }

  revalidatePath("/dj-aanvraag")
}
