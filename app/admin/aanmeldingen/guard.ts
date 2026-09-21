import "server-only"
import { createClient } from "@/lib/supabase/server"

// Wie mag de DJ-wachtrij zien en bewerken? Alleen een beheerder, en als die
// 2FA heeft ingesteld, alleen met een sessie waarin die 2FA ook bevestigd is.
//
// Strenger dan requireAdmin() in ../actions.ts: die kijkt alleen naar de rol.
// Hier komen persoonsgegevens van mensen die nog geen account hebben, dus ook
// de knoppen (server actions) controleren de 2FA, niet alleen de pagina.
export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: "login" | "mfa" }

export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: "login" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "admin") return { ok: false, reason: "login" }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return { ok: false, reason: "mfa" }
  }

  return { ok: true, userId: user.id }
}
