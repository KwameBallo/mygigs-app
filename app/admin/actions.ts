"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

// Verifieer dat de aanroeper daadwerkelijk admin is (rol wordt server-side
// gecontroleerd; de rol-kolom is client-side niet wijzigbaar).
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  return profile?.role === "admin" ? user : null
}

export async function approveDjApplication(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return
  const userId = String(formData.get("user_id") ?? "")
  if (!userId) return

  const service = createAdminClient()
  await service
    .from("dj_applications")
    .update({
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  // Rol naar 'artist': een DJ-account boekt zelf geen DJ's.
  await service.from("profiles").update({ role: "artist" }).eq("id", userId)

  await logAudit({
    actorId: admin.id,
    action: "dj_application.approve",
    targetType: "profile",
    targetId: userId,
  })

  revalidatePath("/admin")
}

// Een bestaande gebruiker (op e-mail) beheerder maken. Alleen een admin kan dit.
// De eerste admin zet je eenmalig zelf via SQL; daarna kun je hier collega's
// toevoegen.
export async function promoteToAdmin(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  if (!email) return

  const service = createAdminClient()
  const { data: target } = await service
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle()
  if (!target) {
    redirect("/admin?admin=notfound")
  }
  await service.from("profiles").update({ role: "admin" }).eq("id", target.id)

  await logAudit({
    actorId: admin.id,
    action: "admin.promote",
    targetType: "profile",
    targetId: target.id,
  })

  redirect("/admin?admin=added")
}

// Een beheerder terugzetten naar organisator. Je kunt jezelf niet verwijderen
// (zo blijft er altijd minstens één admin over).
export async function revokeAdmin(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return
  const userId = String(formData.get("user_id") ?? "")
  if (!userId || userId === admin.id) return

  const service = createAdminClient()
  await service.from("profiles").update({ role: "booker" }).eq("id", userId)

  await logAudit({
    actorId: admin.id,
    action: "admin.revoke",
    targetType: "profile",
    targetId: userId,
  })

  revalidatePath("/admin")
}

export async function rejectDjApplication(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return
  const userId = String(formData.get("user_id") ?? "")
  if (!userId) return

  const service = createAdminClient()
  await service
    .from("dj_applications")
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  await logAudit({
    actorId: admin.id,
    action: "dj_application.reject",
    targetType: "profile",
    targetId: userId,
  })

  revalidatePath("/admin")
}
