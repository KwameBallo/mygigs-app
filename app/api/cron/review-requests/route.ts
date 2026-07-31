import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendReviewRequestToBooker, getUserEmail } from "@/lib/email"

// Draait als geplande taak: stuurt het review-verzoek ~3 uur na het einde van
// het optreden. Beveiligd met CRON_SECRET (Vercel Cron stuurt die als Bearer;
// een externe scheduler kan dezelfde header meesturen).
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: due, error } = await admin.rpc("bookings_due_for_review")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const b of due ?? []) {
    // Atomische claim: markeer als verstuurd; alleen als het nog niet gebeurd
    // is. Zo stuurt een tweede/parallelle run niet nog een mail.
    const { data: claimed } = await admin
      .from("bookings")
      .update({ review_request_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("review_request_sent_at", null)
      .select("id")
    if (!claimed || claimed.length === 0) continue

    try {
      const bookerEmail = await getUserEmail(b.booker_id)
      if (!bookerEmail) continue
      const { data: artist } = await admin
        .from("artists")
        .select("stage_name")
        .eq("id", b.artist_id)
        .maybeSingle()
      await sendReviewRequestToBooker({
        to: bookerEmail,
        locale: "nl",
        djName: artist?.stage_name ?? "de DJ",
        when: new Date(b.event_date).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        bookingId: b.id,
      })
      sent++
    } catch (e) {
      console.error("review-request cron: mail mislukt voor", b.id, e)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
