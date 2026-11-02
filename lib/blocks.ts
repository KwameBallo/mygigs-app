import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// Blokkade-checks voor servercode (boeken en chatten). Via de service-role,
// want een gebruiker mag de blokkades van de ander niet lezen.

// Heeft een van beide de ander geblokkeerd? (beide richtingen)
export async function blockedBetween(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false
  const admin = createAdminClient()
  const { data } = await admin
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`,
    )
    .limit(1)
  return !!(data && data.length > 0)
}

// Heeft de kijker de ander zelf geblokkeerd? (bepaalt de knop-stand)
export async function blocksByViewer(
  viewerId: string,
  otherId: string,
): Promise<boolean> {
  if (!viewerId || !otherId || viewerId === otherId) return false
  const admin = createAdminClient()
  const { data } = await admin
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", otherId)
    .limit(1)
  return !!(data && data.length > 0)
}
