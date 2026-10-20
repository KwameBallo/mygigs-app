import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { authorizeUrl, connectKlaar } from "@/lib/mollie-connect"

// De DJ klikt op "Koppel Mollie". We maken een state aan (tegen CSRF), zetten 'm
// in een cookie, en sturen de DJ naar het autorisatie-scherm van Mollie.
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const base = new URL(request.url)

  if (!connectKlaar()) {
    return NextResponse.redirect(new URL("/dashboard?connect=niet-ingesteld", base))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", base))

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return NextResponse.redirect(new URL("/dashboard", base))

  const state = randomUUID()
  const res = NextResponse.redirect(authorizeUrl(state))
  res.cookies.set("mollie_connect_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return res
}
