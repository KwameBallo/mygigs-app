import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"

export type Club = Tables<"clubs">

export type LineupArtist = {
  id: string
  stage_name: string
  avatar_url: string | null
}

export type EventClub = Pick<Club, "id" | "name" | "city">

export type EventListItem = Tables<"events"> & {
  clubs: EventClub | null
  genres: { id: number; name: string } | null
  event_artists: { artists: LineupArtist | null }[]
}

export type EventFilters = {
  q?: string
  city?: string
  genre?: string
  from?: string
}

const SELECT_LIST =
  "*, clubs(id, name, city), genres(id, name), event_artists(artists(id, stage_name, avatar_url))"

export async function getEvents(
  filters: EventFilters = {},
): Promise<EventListItem[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from("events")
    .select(SELECT_LIST)
    .eq("published", true)
    .gte("event_date", filters.from || today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })

  if (filters.q) query = query.ilike("title", `%${filters.q}%`)
  if (filters.city) query = query.ilike("city", `%${filters.city}%`)
  if (filters.genre) {
    const genreId = Number(filters.genre)
    if (!Number.isNaN(genreId)) query = query.eq("genre_id", genreId)
  }

  const { data } = await query
  return (data as EventListItem[] | null) ?? []
}

export async function getEvent(id: string): Promise<EventListItem | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("events")
    .select(SELECT_LIST)
    .eq("id", id)
    .maybeSingle()
  return (data as EventListItem | null) ?? null
}

export async function getClub(id: string): Promise<Club | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data ?? null
}

export async function getClubEvents(
  clubId: string,
): Promise<EventListItem[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from("events")
    .select(SELECT_LIST)
    .eq("club_id", clubId)
    .eq("published", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
  return (data as EventListItem[] | null) ?? []
}

// ----- beheer (organisator) -----

export async function getMyClubs(userId: string): Promise<Club[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clubs")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })
  return data ?? []
}

export async function getMyEvents(userId: string): Promise<EventListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("events")
    .select(SELECT_LIST)
    .eq("organizer_id", userId)
    .order("event_date", { ascending: true })
  return (data as EventListItem[] | null) ?? []
}

// Lichte lijst van artiesten voor de line-up-selectie.
export async function getArtistOptions(): Promise<
  { id: string; stage_name: string }[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artists")
    .select("id, stage_name")
    .order("stage_name", { ascending: true })
  return data ?? []
}
