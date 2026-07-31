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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
