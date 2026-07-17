"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { priceBreakdown, VAT_RATE } from "@/lib/utils/pricing"

export async function createBooking(formData: FormData) {
  const artistId = String(formData.get("artist_id") ?? "")
  const eventDate = String(formData.get("event_date") ?? "")
  const city = String(formData.get("city") ?? "").trim() || null
  const venue = String(formData.get("venue_name") ?? "").trim() || null
  const message = String(formData.get("message") ?? "").trim() || null

  const bookingType =
    String(formData.get("booking_type") ?? "prive") === "zakelijk"
      ? "zakelijk"
      : "prive"
  const occasion = String(formData.get("occasion") ?? "").trim() || null
  const companyName =
    bookingType === "zakelijk"
      ? String(formData.get("company_name") ?? "").trim() || null
      : null
  const vatNumber =
    bookingType === "zakelijk"
      ? String(formData.get("vat_number") ?? "").trim() || null
      : null
  const invoiceEmail =
    bookingType === "zakelijk"
      ? String(formData.get("invoice_email") ?? "").trim() || null
      : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/artists/${artistId}`)
  }

  // E-mailbevestiging verplicht voordat er geboekt kan worden.
  if (!user.email_confirmed_at) {
    redirect(`/artists/${artistId}?error=confirm-email`)
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("base_gage, equipment_prices")
    .eq("id", artistId)
    .maybeSingle()

  if (!artist) {
    redirect(`/artists/${artistId}?error=notfound`)
  }

  // Alleen de door de boeker gekozen DJ-apparatuur telt mee in het totaal.
  const selectedEquip = formData.getAll("dj_equipment").map(String)
  const prices = (artist.equipment_prices as Record<string, number> | null) ?? {}
  const equipmentCost = selectedEquip.reduce(
    (sum, i) => sum + (Number(prices[i]) || 0),
    0,
  )

  const { gage, commission, total: grossIncl } = priceBreakdown(
    artist.base_gage,
    equipmentCost,
  )
  // Particulier: gage + apparatuur is incl. btw. Zakelijk: dat bedrag is
  // exclusief btw en de boeker betaalt 21% btw erbovenop (t.b.v. de factuur).
  const total =
    bookingType === "zakelijk"
      ? Math.round(grossIncl * (1 + VAT_RATE) * 100) / 100
      : grossIncl

  const { error } = await supabase.from("bookings").insert({
    artist_id: artistId,
    booker_id: user.id,
    event_date: eventDate,
    city,
    venue_name: venue,
    message,
    gage,
    service_fee: commission,
    total,
    booking_type: bookingType,
    occasion,
    company_name: companyName,
    vat_number: vatNumber,
    invoice_email: invoiceEmail,
  })

  if (error) {
    redirect(`/artists/${artistId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/bookings?created=1")
}
