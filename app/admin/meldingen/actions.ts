"use server"

import { revalidatePath } from "next/cache"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

// Beheerder handelt een melding af (reviewed) of negeert 'm (dismissed).
export async function setReportStatus(formData: FormData) {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") return
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!id || !["open", "reviewed", "dismissed"].includes(status)) return
  const admin = createAdminClient()
  await admin.from("reports").update({ status }).eq("id", id)
  revalidatePath("/admin/meldingen")
}
