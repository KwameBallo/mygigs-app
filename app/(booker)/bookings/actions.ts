"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { maakBetaling, mollieKlaar } from "@/lib/mollie"
import { siteUrl } from "@/lib/dj-leads"

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
// met de GPS-check-in van de DJ maakt dit een gefakete no-show onmogelijk -
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


// =============================================================
// De boeker betaalt een geaccepteerde boeking.
//
// Hier gebeurt vanaf nu bijna niets meer. We controleren of deze boeking van
// deze gebruiker is en open staat, zetten een betaling klaar bij Mollie, en
// sturen de klant daarheen. Verder niets.
//
// Dat is met opzet. Of er betaald is weten we pas als Mollie het zegt, en dat
// zegt hij via de webhook, niet via de browser van de klant. De klant kan na
// het betalen zijn telefoon in zijn zak steken, op terug drukken of door een
// tunnel rijden; de webhook komt hoe dan ook. Alles wat ertoe doet staat
// daarom in lib/payments.ts en wordt daarvandaan aangeroepen.
//
// De boeking blijft tot dat moment op 'accepted'. Geen geld, geen status.
// =============================================================

export async function payBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  if (!bookingId) return

  // Leeg betekent: laat de klant bij Mollie kiezen. Dat scherm is beter dan
  // het onze, en kent de banken die wij niet bijhouden.
  const gekozen = String(formData.get("payment_method") ?? "")
  const methode =
    gekozen === "ideal" ? "ideal" : gekozen === "card" ? "creditcard" : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  // Betalen kan alleen met een bevestigd e-mailadres.
  if (!user.email_confirmed_at) redirect("/bookings")

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, total, status, event_date, city, artists(stage_name)")
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .maybeSingle()
  if (!booking || booking.status !== "accepted") return

  if (!mollieKlaar()) {
    console.error("betalen gevraagd maar MOLLIE_API_KEY ontbreekt")
    redirect(`/bookings/${bookingId}/pay?fout=nietingesteld`)
  }

  const artiest = Array.isArray(booking.artists)
    ? booking.artists[0]
    : booking.artists
  const omschrijving = `MyGigs boeking ${bookingId.slice(0, 8)} - ${
    artiest?.stage_name ?? "DJ"
  }`

  const admin = createAdminClient()

  // Geen try/catch om deze aanroep heen: redirect() werkt in Next door een
  // fout te gooien, en die zou dan in onze eigen catch belanden. Vandaar
  // .catch() op de aanroep zelf en de redirect erbuiten.
  const betaling = await maakBetaling({
    bedragEur: Number(booking.total),
    omschrijving,
    terugUrl: `${siteUrl()}/bookings/${bookingId}/betaald`,
    webhookUrl: `${siteUrl()}/api/webhooks/mollie`,
    metadata: { booking_id: bookingId, booker_id: user.id },
    methode,
  }).catch((e) => {
    console.error("Mollie-betaling aanmaken mislukt:", e)
    return null
  })

  if (!betaling) redirect(`/bookings/${bookingId}/pay?fout=provider`)

  // De betaalregel wordt nu al aangemaakt, op pending. Zo kan de webhook hem
  // straks terugvinden op het nummer van Mollie, en zie jij in de database ook
  // de pogingen die nooit afgerond zijn.
  const { error } = await admin.from("payments").insert({
    booking_id: bookingId,
    amount: booking.total,
    currency: "eur",
    provider: "mollie",
    provider_ref: betaling.id,
    provider_payment_id: betaling.id,
    provider_status: "open",
    status: "pending",
  })
  if (error) {
    console.error("betaalregel aanmaken mislukt:", error.message)
    redirect(`/bookings/${bookingId}/pay?fout=opslaan`)
  }

  await logAudit({
    actorId: user.id,
    action: "payment.started",
    targetType: "booking",
    targetId: bookingId,
    metadata: { bedrag: booking.total, methode: methode ?? "keuze bij Mollie", mollie: betaling.id },
  })

  // Naar de betaalpagina van Mollie. Vanaf hier is het hun scherm.
  redirect(betaling.checkoutUrl)
}
