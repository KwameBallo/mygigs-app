"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { priceBreakdown } from "@/lib/utils/pricing"

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

  const { data: artist } = await supabase
    .from("artists")
    .select("base_gage")
    .eq("id", artistId)
    .maybeSingle()

  if (!artist) {
    redirect(`/artists/${artistId}?error=notfound`)
  }

  const { gage, commission, total } = priceBreakdown(artist.base_gage)

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
