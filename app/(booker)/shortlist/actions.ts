"use server"

import { randomUUID } from "crypto"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { priceBreakdown } from "@/lib/utils/pricing"

export async function createShortlist(formData: FormData) {
  const artistIds = formData.getAll("artist_ids").map(String).filter(Boolean)
  const eventDate = String(formData.get("event_date") ?? "")
  const city = String(formData.get("city") ?? "").trim() || null
  const venue = String(formData.get("venue_name") ?? "").trim() || null
  const message = String(formData.get("message") ?? "").trim() || null
  const occasion = String(formData.get("occasion") ?? "").trim() || null

  const bookingType: "prive" | "zakelijk" =
    String(formData.get("booking_type") ?? "prive") === "zakelijk"
      ? "zakelijk"
      : "prive"
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

  if (artistIds.length === 0 || !eventDate) {
    redirect("/shortlist?error=missing")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/shortlist")

  // Haal de gages van alle geselecteerde artiesten in één query.
  const { data: artists } = await supabase
    .from("artists")
    .select("id, base_gage")
    .in("id", artistIds)

  if (!artists || artists.length === 0) {
    redirect("/shortlist?error=notfound")
  }

  const shortlistId = randomUUID()

  const rows = artists.map((a) => {
    const { gage, commission, total } = priceBreakdown(a.base_gage)
    return {
      artist_id: a.id,
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
      shortlist_id: shortlistId,
    }
  })

  const { error } = await supabase.from("bookings").insert(rows)

  if (error) {
    console.error("createShortlist failed:", error.message)
    redirect(
      `/shortlist?error=${encodeURIComponent("Je aanvraag kon niet worden verstuurd. Probeer het opnieuw.")}`,
    )
  }

  redirect("/bookings?shortlist=1")
}
