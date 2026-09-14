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

// Meerdere dagen in één keer beschikbaar maken, met dezelfde tijden.
//
// De kalender roept dit pas aan nadat de DJ zijn selectie heeft bevestigd met
// "Schema doorvoeren". Bewust geen toggle: een tweede klik of een dubbele
// verzending mag de dagen niet alsnog weghalen. Bestaat een dag al, dan werken
// we alleen de tijden bij; een geboekte dag laten we ongemoeid.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_DATES = 120

function parseDates(raw: string): string[] {
  const seen = new Set<string>()
  for (const d of raw.split(",")) {
    const v = d.trim()
    if (DATE_RE.test(v)) seen.add(v)
    if (seen.size >= MAX_DATES) break
  }
  return [...seen]
}

export async function setAvailabilityBulk(formData: FormData) {
  const dates = parseDates(String(formData.get("dates") ?? ""))
  const start = String(formData.get("start") ?? "").trim() || null
  const end = String(formData.get("end") ?? "").trim() || null
  if (dates.length === 0) return

  const artistId = await myArtistId()
  if (!artistId) return

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("artist_availability")
    .select("id, date, status")
    .eq("artist_id", artistId)
    .in("date", dates)

  const rows = existing ?? []
  const known = new Set(rows.map((r) => r.date))

  // Nieuwe dagen erbij, in één insert.
  const missing = dates.filter((d) => !known.has(d))
  if (missing.length > 0) {
    await supabase.from("artist_availability").insert(
      missing.map((date) => ({
        artist_id: artistId,
        date,
        status: "available" as const,
        start_time: start,
        end_time: end,
      })),
    )
  }

  // Bestaande dagen: alleen de tijden bijwerken, geboekte dagen overslaan.
  const updatable = rows.filter((r) => r.status !== "booked").map((r) => r.id)
  if (updatable.length > 0) {
    await supabase
      .from("artist_availability")
      .update({ start_time: start, end_time: end })
      .in("id", updatable)
  }

  revalidatePath("/availability")
  revalidatePath("/dashboard")
}

// Meerdere dagen weer weghalen. Ook hier geen toggle, zodat "verwijderen" nooit
// per ongeluk "toevoegen" wordt.
export async function removeAvailabilityBulk(formData: FormData) {
  const dates = parseDates(String(formData.get("dates") ?? ""))
  if (dates.length === 0) return

  const artistId = await myArtistId()
  if (!artistId) return

  const supabase = await createClient()
  await supabase
    .from("artist_availability")
    .delete()
    .eq("artist_id", artistId)
    .in("date", dates)
    .eq("status", "available") // een geboekte dag blijft staan

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
  const artistId = await myArtistId()
  if (!artistId) return
  const supabase = await createClient()
  // Expliciete eigenaarschap-filter naast de RLS-policy (defense-in-depth, SEC #8).
  await supabase
    .from("artist_availability")
    .delete()
    .eq("id", id)
    .eq("artist_id", artistId)
  revalidatePath("/availability")
}
