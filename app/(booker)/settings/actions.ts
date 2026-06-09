"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateAccount(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("profiles")
    .update({ full_name: full_name || null })
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
