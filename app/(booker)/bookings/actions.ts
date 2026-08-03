"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { generateInvoicesForBooking } from "@/lib/invoicing"
import {
  sendPaymentReceipt,
  sendBookingConfirmedToDJ,
  getUserEmail,
} from "@/lib/email"
import { getI18n } from "@/lib/i18n"
import { formatEuro, VAT_RATE } from "@/lib/utils/pricing"

// De boeker annuleert een eigen aanvraag. Alleen als de boeking nog niet
// definitief is (in afwachting of geaccepteerd) en van deze gebruiker is.
export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  if (!bookingId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Status wordt server-side gezet (client mag 'status' niet meer schrijven). De
  // filters op booker_id + toegestane statussen borgen dat het je eigen boeking is.
  const { data: cancelled } = await createAdminClient()
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .in("status", ["pending", "accepted"])
    .select("id")

  if (cancelled && cancelled.length > 0) {
    await logAudit({
      actorId: user.id,
      action: "booking.cancel",
      targetType: "booking",
      targetId: bookingId,
    })
  }

  revalidatePath("/bookings")
}

// Tweezijdig aanwezigheidsbewijs: de klant bevestigt dat de DJ er was. Samen
// met de GPS-check-in van de DJ maakt dit een gefakete no-show onmogelijk —
// van beide kanten. Kan alleen bij een betaalde/afgeronde eigen boeking.
export async function confirmDjAttendance(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  if (!bookingId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: confirmed } = await createAdminClient()
    .from("bookings")
    .update({ booker_confirmed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .in("status", ["paid", "completed"])
    .is("booker_confirmed_at", null)
    .select("id")

  if (confirmed && confirmed.length > 0) {
    await logAudit({
      actorId: user.id,
      action: "booking.attendance_confirmed",
      targetType: "booking",
      targetId: bookingId,
    })
  }

  revalidatePath("/bookings")
  revalidatePath("/dashboard")
}

// De boeker betaalt een geaccepteerde boeking. Het geld wordt bij MyGigs
// vastgehouden (escrow) en binnen 5 werkdagen na het optreden uitbetaald aan
// de DJ. Simulatie: er is nog geen echte betaalprovider gekoppeld.
export async function payBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  if (!bookingId) return

  // Alleen digitale betaalmethoden — geen contant. Nu nog gesimuleerd; zodra
  // Stripe gekoppeld is komt hier een echte iDEAL/creditcard-PaymentIntent.
  const rawMethod = String(formData.get("payment_method") ?? "")
  const paymentMethod = ["ideal", "card"].includes(rawMethod)
    ? rawMethod
    : "ideal"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  // Betalen kan alleen met een bevestigd e-mailadres.
  if (!user.email_confirmed_at) redirect("/bookings")

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, artist_id, total, service_fee, status, event_date, city, venue_name, artists(stage_name, user_id)",
    )
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .maybeSingle()
  if (!booking || booking.status !== "accepted") return

  const admin = createAdminClient()

  // 1) Atomisch claimen: alleen als de boeking NOG 'accepted' is zetten we 'm op
  //    'paid'. Een tweede gelijktijdige/herhaalde poging raakt 0 rijen en stopt —
  //    zo geen dubbele betaling of dubbele uitbetaling (FIX #3).
  const { data: claimed } = await admin
    .from("bookings")
    .update({ status: "paid" })
    .eq("id", booking.id)
    .eq("status", "accepted")
    .select("id")
  if (!claimed || claimed.length === 0) {
    redirect("/bookings")
  }

  // Commissie incl. 21% btw wordt ingehouden (gelijk aan de commissie-factuur);
  // de DJ ontvangt het restant netto. Grondslag staat in de algemene voorwaarden.
  const commissionInclVat =
    Math.round(Number(booking.service_fee ?? 0) * (1 + VAT_RATE) * 100) / 100
  const payout = Math.max(0, Number(booking.total) - commissionInclVat)

  // 2) Betaling vastleggen — geld staat vast bij MyGigs (escrow).
  await admin.from("payments").insert({
    booking_id: booking.id,
    amount: booking.total,
    currency: "eur",
    provider: "mock",
    provider_ref: `sim-${paymentMethod}`,
    status: "held",
  })

  // 3) Uitbetaling inplannen (bedrag minus commissie). De unieke index op
  //    payouts.booking_id is de backstop tegen dubbele rijen.
  await admin.from("payouts").insert({
    artist_id: booking.artist_id,
    booking_id: booking.id,
    amount: payout,
    status: "scheduled",
  })

  // 4) Facturen aanmaken (verkoopfactuur DJ->klant + commissie MyGigs->DJ).
  //    Best-effort: een factuurfout mag de betaling niet blokkeren.
  try {
    await generateInvoicesForBooking(booking.id)
  } catch (e) {
    console.error("invoice generation failed:", e)
  }

  // 5) Mails: betaalbewijs naar de boeker + bevestiging naar de DJ. Best-effort.
  try {
    const { locale } = await getI18n()
    const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
    const artist = Array.isArray(booking.artists)
      ? booking.artists[0]
      : booking.artists
    const when = new Date(booking.event_date).toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const place = [booking.city, booking.venue_name].filter(Boolean).join(" · ")

    const bookerEmail = await getUserEmail(user.id)
    if (bookerEmail) {
      await sendPaymentReceipt({
        to: bookerEmail,
        locale,
        djName: artist?.stage_name ?? "DJ",
        when,
        place,
        amount: formatEuro(booking.total),
      })
    }

    const djEmail = artist?.user_id ? await getUserEmail(artist.user_id) : null
    if (djEmail) {
      await sendBookingConfirmedToDJ({
        to: djEmail,
        locale,
        when,
        place,
        payout: formatEuro(payout),
      })
    }
  } catch (e) {
    console.error("payment emails failed:", e)
  }

  // Audit: betaling in escrow + geplande uitbetaling (A.8.15).
  await logAudit({
    actorId: user.id,
    action: "payment.hold",
    targetType: "booking",
    targetId: booking.id,
    metadata: { amount: booking.total, method: paymentMethod, payout },
  })

  revalidatePath("/bookings")
  revalidatePath("/dashboard")
  redirect("/bookings?paid=1")
}
