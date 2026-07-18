"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// AVG — recht op verwijdering: wist het account en (via cascade) de gekoppelde
// gegevens. Best-effort: bij een FK-conflict wordt niets half verwijderd.
export async function deleteAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error("deleteAccount failed:", error.message)
    redirect("/settings?error=delete")
  }

  await supabase.auth.signOut()
  redirect("/?deleted=1")
}

export async function updateAccount(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim()
  const gender = String(formData.get("gender") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      gender: gender || null,
      phone: phone || null,
    })
    .eq("id", user.id)

  revalidatePath("/settings")
}

// Bedrijfs-/factuurgegevens die bij elke zakelijke boeking hergebruikt worden.
export async function updateCompanyDetails(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim()
    return v === "" ? null : v
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("profiles")
    .update({
      company_name: str("company_name"),
      vat_number: str("vat_number"),
      invoice_email: str("invoice_email"),
      invoice_address: str("invoice_address"),
    })
    .eq("id", user.id)

  revalidatePath("/settings")
}
