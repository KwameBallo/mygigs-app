"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function myArtistId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  return data?.id ?? null
}

export async function addAvailability(formData: FormData) {
  const date = String(formData.get("date") ?? "")
  if (!date) return
  const artistId = await myArtistId()
  if (!artistId) return

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("artist_availability")
    .select("id")
    .eq("artist_id", artistId)
    .eq("date", date)
    .maybeSingle()
  if (!existing) {
    await supabase
      .from("artist_availability")
      .insert({ artist_id: artistId, date, status: "available" })
  }
  revalidatePath("/availability")
}

export async function removeAvailability(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const supabase = await createClient()
  await supabase.from("artist_availability").delete().eq("id", id)
  revalidatePath("/availability")
}
