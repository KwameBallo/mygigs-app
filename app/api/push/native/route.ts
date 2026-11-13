import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Slaat de native push-token (APNs/FCM) van het ingelogde apparaat op. De app
// stuurt dit na toestemming voor meldingen. Schrijven via de service-role.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const platform = body?.platform === "android" ? "android" : "ios"
  if (!token || token.length > 400) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin.from("device_push_tokens").upsert(
    {
      user_id: user.id,
      platform,
      token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  )
  if (error) return NextResponse.json({ ok: false }, { status: 500 })
  return NextResponse.json({ ok: true })
}
