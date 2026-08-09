import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendMonthlyRecapToDJ, getUserEmail } from "@/lib/email"
import { sendPushToUser } from "@/lib/push"
import { formatEuro } from "@/lib/utils/pricing"

// Geplande taak: stuurt begin de maand elke DJ een terugblik op de vorige maand
// (aantal optredens, steden, verdiensten) via e-mail + push. Idempotent per
// (DJ, periode) zodat het bij dagelijks draaien maar één keer gaat. Beveiligd
// met CRON_SECRET. Geen klantgegevens — alleen aantallen/plaatsen (AVG).
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const firstOfThis = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
  const firstOfPrev = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  )
  const period = firstOfPrev.toISOString().slice(0, 7) // 'YYYY-MM'
  const startISO = firstOfPrev.toISOString().slice(0, 10)
  const endISO = firstOfThis.toISOString().slice(0, 10)
  const monthLabel = firstOfPrev.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  })

  const { data: rows, error } = await admin
    .from("bookings")
    .select("artist_id, city, gage, status, event_date")
    .gte("event_date", startISO)
    .lt("event_date", endISO)
    .in("status", ["accepted", "paid", "completed"])
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const byArtist = new Map<
    string,
    { count: number; earned: number; cities: Set<string> }
  >()
  for (const b of rows ?? []) {
    if (!b.artist_id) continue
    let g = byArtist.get(b.artist_id)
    if (!g) {
      g = { count: 0, earned: 0, cities: new Set() }
      byArtist.set(b.artist_id, g)
    }
    g.count++
    g.earned += b.gage ?? 0
    if (b.city) g.cities.add(b.city)
  }

  let sent = 0
  for (const [artistId, g] of byArtist) {
    if (g.count === 0) continue

    // Idempotente claim per (DJ, periode): alleen versturen als dit een nieuwe
    // rij is. Bij een duplicaat geeft de upsert niets terug → overslaan.
    const { data: claimed } = await admin
      .from("dj_monthly_recap")
      .upsert(
        { artist_id: artistId, period, sent_at: new Date().toISOString() },
        { onConflict: "artist_id,period", ignoreDuplicates: true },
      )
      .select("artist_id")
    if (!claimed || claimed.length === 0) continue

    const { data: artist } = await admin
      .from("artists")
      .select("user_id")
      .eq("id", artistId)
      .maybeSingle()
    if (!artist?.user_id) continue

    const cities = [...g.cities].join(", ")
    try {
      const email = await getUserEmail(artist.user_id)
      if (email) {
        await sendMonthlyRecapToDJ({
          to: email,
          locale: "nl",
          monthLabel,
          gigs: g.count,
          cities,
          earned: formatEuro(g.earned),
        })
      }
      await sendPushToUser(artist.user_id, {
        title: `Je maand: ${g.count} ${g.count === 1 ? "optreden" : "optredens"} 🎧`,
        body: `Bekijk je gigs van ${monthLabel} op de kaart.`,
        url: "/dashboard",
      })
      sent++
    } catch (e) {
      console.error("monthly-recap: verzenden mislukt voor", artistId, e)
    }
  }

  return NextResponse.json({ ok: true, sent, period })
}
