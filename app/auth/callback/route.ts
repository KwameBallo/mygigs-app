import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Handles the email-confirmation / magic-link redirect from Supabase.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Alleen een lokaal pad toestaan (moet met één '/' beginnen). Voorkomt een
  // open redirect via next=//evil.com of next=/\evil.com (FIX #14).
  const rawNext = searchParams.get("next") ?? "/discover"
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/discover"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Wie zich via de DJ-kant heeft aangemeld, sturen we na de bevestiging
      // naar de aanvraag. De aanvraag zelf ontstaat pas als hij die opstuurt,
      // zodat er geen lege aanvragen in het beheerscherm belanden.
      const wantsDj = data.user?.user_metadata?.wants_dj === true
      const target = wantsDj && next === "/discover" ? "/dj-aanvraag" : next
      return NextResponse.redirect(`${origin}${target}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
