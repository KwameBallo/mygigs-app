"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Organisator-voorkeuren opslaan (voedt de 'Aanbevolen'-lijst) + prefs_set=true
// zodat het onboarding-formulier niet blijft terugkomen.
export async function savePreferences(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/voorkeuren")

  const province = String(formData.get("province") ?? "").trim() || null
  const budgetRaw = Number(formData.get("budget"))
  const budget =
    Number.isFinite(budgetRaw) && budgetRaw > 0 ? Math.round(budgetRaw) : null
  const genreRaw = Number(formData.get("genre_id"))
  const genreId = Number.isFinite(genreRaw) && genreRaw > 0 ? genreRaw : null
  const date = String(formData.get("date") ?? "").trim() || null

  await supabase
    .from("profiles")
    .update({
      pref_province: province,
      pref_budget: budget,
      pref_genre_id: genreId,
      pref_date: date,
      prefs_set: true,
    })
    .eq("id", user.id)

  redirect("/discover?rec=1")
}

// Overslaan: markeer als afgehandeld zodat het niet blijft terugkomen.
export async function skipPreferences() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/voorkeuren")
  await supabase.from("profiles").update({ prefs_set: true }).eq("id", user.id)
  redirect("/discover")
}
