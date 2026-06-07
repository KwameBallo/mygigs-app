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
