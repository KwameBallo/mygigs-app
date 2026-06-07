import { createClient } from "@/lib/supabase/server"
import type { Artist } from "@/lib/data/artists"

export async function getFavorites(bookerId: string): Promise<Artist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("favorites")
    .select("artists(*, genres(*))")
    .eq("booker_id", bookerId)
    .order("created_at", { ascending: false })

  return (data ?? [])
    .map((f) => f.artists as unknown as Artist)
    .filter(Boolean)
}
