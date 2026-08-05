import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push"

// Geplande taak: stuurt ~24 uur vóór de starttijd een herinnering naar de DJ én
// de organisator. Gekoppeld aan de geboekte tijd (NL-tijd) via de RPC
// bookings_due_for_reminder(). Beveiligd met CRON_SECRET.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: due, error } = await admin.rpc("bookings_due_for_reminder")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const b of due ?? []) {
    // Atomische claim: alleen als er nog geen herinnering is gestuurd.
    const { data: claimed } = await admin
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null)
      .select("id")
    if (!claimed || claimed.length === 0) continue

    try {
      const { data: artist } = await admin
        .from("artists")
        .select("user_id")
        .eq("id", b.artist_id)
        .maybeSingle()

      await Promise.all([
        artist?.user_id
          ? sendPushToUser(artist.user_id, {
              title: "Morgen speel je! 🎧",
              body: "Heb je alle info die je nodig hebt? Stuur de klant gerust een berichtje.",
              url: "/dashboard",
            })
          : null,
        sendPushToUser(b.booker_id, {
          title: "Morgen is het zo ver!",
          body: "Heb je alle info? Stuur de DJ gerust een berichtje.",
          url: "/bookings",
        }),
      ])
      sent++
    } catch (e) {
      console.error("booking-reminder cron: push mislukt voor", b.id, e)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
