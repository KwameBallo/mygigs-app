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

// Eén dag aan/uit zetten vanuit de kalender. Geboekte dagen blijven staan.
export async function toggleAvailability(date: string) {
  if (!date) return
  const artistId = await myArtistId()
  if (!artistId) return

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("artist_availability")
    .select("id, status")
    .eq("artist_id", artistId)
    .eq("date", date)
    .maybeSingle()

  if (existing) {
    if (existing.status === "booked") return // geboekt: niet wijzigen
    await supabase.from("artist_availability").delete().eq("id", existing.id)
  } else {
    await supabase
      .from("artist_availability")
      .insert({ artist_id: artistId, date, status: "available" })
  }

  revalidatePath("/availability")
  revalidatePath("/dashboard")
}

// Beschikbare tijden (van/tot) voor een dag opslaan. Leeg = hele dag.
export async function saveAvailabilityTime(formData: FormData) {
  const date = String(formData.get("date") ?? "")
  const start = String(formData.get("start") ?? "").trim() || null
  const end = String(formData.get("end") ?? "").trim() || null
  if (!date) return

  const artistId = await myArtistId()
  if (!artistId) return

  const supabase = await createClient()
  await supabase
    .from("artist_availability")
    .update({ start_time: start, end_time: end })
    .eq("artist_id", artistId)
    .eq("date", date)
    .eq("status", "available")

  revalidatePath("/availability")
}

export async function removeAvailability(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const supabase = await createClient()
  await supabase.from("artist_availability").delete().eq("id", id)
  revalidatePath("/availability")
}
