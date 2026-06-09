"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v || null
}

function optInt(formData: FormData, key: string): number | null {
  const v = str(formData, key)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

export async function createClub(formData: FormData) {
  const name = str(formData, "name")
  if (!name) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("clubs").insert({
    user_id: user.id,
    name,
    city: optStr(formData, "city"),
    address: optStr(formData, "address"),
    description: optStr(formData, "description"),
    image_url: optStr(formData, "image_url"),
    capacity: optInt(formData, "capacity"),
    website_url: optStr(formData, "website_url"),
    contact_email: optStr(formData, "contact_email"),
    contact_phone: optStr(formData, "contact_phone"),
  })

  revalidatePath("/events/manage")
}

export async function createEvent(formData: FormData) {
  const clubId = str(formData, "club_id")
  const title = str(formData, "title")
  const eventDate = str(formData, "event_date")
  if (!clubId || !title || !eventDate) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Veiligheid: alleen events maken bij een eigen locatie.
  const { data: club } = await supabase
    .from("clubs")
    .select("id, city")
    .eq("id", clubId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!club) return

  const { data: event } = await supabase
    .from("events")
    .insert({
      club_id: clubId,
      organizer_id: user.id,
      title,
      event_date: eventDate,
      description: optStr(formData, "description"),
      start_time: optStr(formData, "start_time"),
      end_time: optStr(formData, "end_time"),
      genre_id: optInt(formData, "genre_id"),
      city: optStr(formData, "city") ?? club.city,
      flyer_url: optStr(formData, "flyer_url"),
      ticket_url: optStr(formData, "ticket_url"),
      ticket_price: optInt(formData, "ticket_price"),
      min_age: optInt(formData, "min_age"),
    })
    .select("id")
    .single()

  if (event) {
    const artistIds = formData
      .getAll("artist_ids")
      .map((v) => String(v))
      .filter(Boolean)
    if (artistIds.length > 0) {
      await supabase.from("event_artists").insert(
        artistIds.map((artist_id, i) => ({
          event_id: event.id,
          artist_id,
          sort_order: i,
        })),
      )
    }
  }

  revalidatePath("/events/manage")
  revalidatePath("/events")
}

export async function deleteEvent(formData: FormData) {
  const id = str(formData, "event_id")
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // RLS dwingt eigenaarschap af; expliciete filter voor de zekerheid.
  await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("organizer_id", user.id)

  revalidatePath("/events/manage")
  revalidatePath("/events")
}
