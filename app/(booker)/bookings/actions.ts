"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .in("status", ["pending", "accepted"])

  revalidatePath("/bookings")
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

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, artist_id, total, service_fee, status")
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .maybeSingle()
  if (!booking || booking.status !== "accepted") return

  const admin = createAdminClient()

  // 1) Betaling vastleggen — geld staat vast bij MyGigs (escrow).
  //    provider_ref markeert (voorlopig) de gekozen methode; straks de
  //    Stripe PaymentIntent-id.
  await admin.from("payments").insert({
    booking_id: booking.id,
    amount: booking.total,
    currency: "eur",
    provider: "mock",
    provider_ref: `sim-${paymentMethod}`,
    status: "held",
  })

  // 2) Uitbetaling inplannen (bedrag minus MyGigs-commissie).
  const payout = Math.max(
    0,
    Number(booking.total) - Number(booking.service_fee ?? 0),
  )
  await admin.from("payouts").insert({
    artist_id: booking.artist_id,
    booking_id: booking.id,
    amount: payout,
    status: "scheduled",
  })

  // 3) Boeking op 'betaald' zetten.
  await admin.from("bookings").update({ status: "paid" }).eq("id", booking.id)

  revalidatePath("/bookings")
  revalidatePath("/dashboard")
  redirect("/bookings?paid=1")
}
