import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"

export type Profile = Tables<"profiles">

// Returns the signed-in user's profile, or null when logged out.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  return data
}

// Zoals getProfile(), maar geeft ook terug of het e-mailadres bevestigd is —
// nodig om boeken/betalen pas toe te staan na e-mailbevestiging.
export async function getViewer(): Promise<{
  profile: Profile | null
  emailConfirmed: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { profile: null, emailConfirmed: false }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  return { profile: data, emailConfirmed: !!user.email_confirmed_at }
}
