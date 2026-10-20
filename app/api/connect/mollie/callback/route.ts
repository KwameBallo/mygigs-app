import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  exchangeCode,
  getOrganizationId,
  getOnboarding,
  CONNECT_SCOPES,
} from "@/lib/mollie-connect"

// Mollie stuurt de DJ hier terug met een code. We controleren de state, wisselen
// de code in voor tokens, halen het org-nummer en de onboardingstatus op, en
// slaan alles op. De refresh_token gaat in de aparte tabel mollie_connections.
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const err = url.searchParams.get("error")
  const saved = request.cookies.get("mollie_connect_state")?.value

  const back = (q: string) => {
    const r = NextResponse.redirect(new URL(`/dashboard?${q}`, url))
    r.cookies.delete("mollie_connect_state")
    return r
  }

  if (err) return back("connect=geweigerd")
  if (!code || !state || !saved || state !== saved) return back("connect=mislukt")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return back("connect=login")

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return back("connect=geen-dj")

  try {
    const tokens = await exchangeCode(code)
    const [orgId, onb] = await Promise.all([
      getOrganizationId(tokens.access_token),
      getOnboarding(tokens.access_token),
    ])

    const admin = createAdminClient()
    const now = new Date().toISOString()
    await admin.from("mollie_connections").upsert({
      artist_id: artist.id,
      refresh_token: tokens.refresh_token,
      scopes: tokens.scope ?? CONNECT_SCOPES,
      connected_at: now,
      last_refresh_at: now,
    })
    await admin
      .from("artists")
      .update({
        mollie_organization_id: orgId,
        onboarding_status: onb.status,
        can_receive_payments: onb.canReceivePayments,
        onboarding_checked_at: now,
      })
      .eq("id", artist.id)

    return back("connect=gelukt")
  } catch (e) {
    console.error("Mollie Connect callback mislukt:", e)
    return back("connect=mislukt")
  }
}
