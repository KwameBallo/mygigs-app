"use server"

import { revalidatePath } from "next/cache"
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
  // Rol naar 'both': DJ + kan zelf blijven boeken.
  await service.from("profiles").update({ role: "both" }).eq("id", userId)

  await logAudit({
    actorId: admin.id,
    action: "dj_application.approve",
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
