import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Tables } from "@/types/database"

export type Profile = Tables<"profiles">

// Het eigen volledige profiel via de service-role. De gevoelige profielkolommen
// (telefoon/e-mail/facturatie/stripe) zijn column-REVOKED voor de tegenpartij
// (SEC #2, migratie 0029), dus een gewone select("*") zou voor de eigenaar falen.
// De eigenaar mag z'n eigen volledige rij wél zien; de eq("id", user.id)-filter
// houdt het strikt bij de eigen rij.
async function ownProfile(userId: string): Promise<Profile | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  return data
}

// Returns the signed-in user's profile, or null when logged out.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return ownProfile(user.id)
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

  const data = await ownProfile(user.id)

  return { profile: data, emailConfirmed: !!user.email_confirmed_at }
}
