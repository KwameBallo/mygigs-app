import { createClient } from "@/lib/supabase/server"

export type ConversationSummary = {
  id: string
  artist_id: string
  booker_id: string
  artist: { id: string; stage_name: string; avatar_url: string | null } | null
  booker: { id: string; full_name: string | null } | null
  lastMessage: { body: string; created_at: string } | null
  unread: number
}

// Returns the artist ids owned by the given user (empty if none).
async function ownedArtistIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
  return (data ?? []).map((a) => a.id)
}

export async function getConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const artistIds = await ownedArtistIds(userId)

  let query = supabase
    .from("conversations")
    .select(
      "id, artist_id, booker_id, artists(id, stage_name, avatar_url), profiles!conversations_booker_id_fkey(id, full_name)",
    )
    .order("created_at", { ascending: false })

  if (artistIds.length > 0) {
    query = query.or(
      `booker_id.eq.${userId},artist_id.in.(${artistIds.join(",")})`,
    )
  } else {
    query = query.eq("booker_id", userId)
  }

  const { data: convs } = await query
  const list = convs ?? []

  const summaries = await Promise.all(
    list.map(async (c) => {
      const { data: last } = await supabase
        .from("messages")
        .select("body, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .is("read_at", null)
        .neq("sender_id", userId)

      return {
        id: c.id,
        artist_id: c.artist_id,
        booker_id: c.booker_id,
        artist: c.artists as ConversationSummary["artist"],
        booker: c.profiles as ConversationSummary["booker"],
        lastMessage: last ?? null,
        unread: count ?? 0,
      }
    }),
  )

  return summaries
}

export async function getUnreadCount(userId: string): Promise<number> {
  const convs = await getConversations(userId)
  return convs.reduce((sum, c) => sum + c.unread, 0)
}
