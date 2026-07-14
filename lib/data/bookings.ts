import { createClient } from "@/lib/supabase/server"

// Aantal openstaande (nieuwe) boekingsaanvragen voor de DJ van deze gebruiker.
// Wordt als melding/badge op "Dashboard" getoond.
export async function getPendingBookingCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()
  if (!artist) return 0

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artist.id)
    .eq("status", "pending")

  return count ?? 0
}
