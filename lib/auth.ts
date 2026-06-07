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
