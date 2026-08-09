"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { priceBreakdown, VAT_RATE, formatEuro } from "@/lib/utils/pricing"
import { getI18n } from "@/lib/i18n"
import { sendNewRequestToDJ, getUserEmail } from "@/lib/email"
import { sendPushToUser } from "@/lib/push"
import { rateLimit } from "@/lib/ratelimit"
import { pdokLookup } from "@/lib/geo"
import {
  rangeHours,
  withinWindow,
  rangesOverlap,
  BOOKING_BUFFER_MIN,
} from "@/lib/time"
import { dict } from "./i18n"

export async function createBooking(formData: FormData) {
  const artistId = String(formData.get("artist_id") ?? "")
  const eventDate = String(formData.get("event_date") ?? "")
  const addressId = String(formData.get("address_id") ?? "").trim()
  const venue = String(formData.get("venue_name") ?? "").trim() || null
  const message = String(formData.get("message") ?? "").trim() || null

  // Tijdvak van het optreden (HH:MM). De duur — en dus de gage — volgt hieruit.
  const startTime = String(formData.get("start_time") ?? "").trim() || null
  const endTime = String(formData.get("end_time") ?? "").trim() || null

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

  // Rate-limit: elke aanvraag stuurt de DJ een e-mail + 2 pushmeldingen, dus
  // begrenzen tegen spam/harassment en externe kosten (SEC #4).
  const rl = await rateLimit(user.id, {
    limit: 12,
    windowSec: 3600,
    scope: "booking",
  })
  if (!rl.ok) redirect(`/artists/${artistId}?error=too-many`)

  // E-mailbevestiging verplicht voordat er geboekt kan worden.
  if (!user.email_confirmed_at) {
    redirect(`/artists/${artistId}?error=confirm-email`)
  }

  // Een DJ-account boekt zelf geen DJ's.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (me?.role === "artist" || me?.role === "both") {
    redirect("/dashboard")
  }

  const { data: artist } = await supabase
    .from("artists")
    .select("base_gage, equipment_prices, user_id, stage_name")
    .eq("id", artistId)
    .maybeSingle()

  if (!artist) {
    redirect(`/artists/${artistId}?error=notfound`)
  }

  // Agenda-check: de gekozen datum moet bij de DJ beschikbaar zijn.
  // - Is de dag als "booked" gemarkeerd → altijd blokkeren (geen dubbele boeking).
  // - Gebruikt de DJ zijn agenda (heeft hij beschikbare dagen) maar staat deze
  //   dag daar niet tussen → blokkeren. Een DJ zonder ingevulde agenda blijft
  //   op elke datum aanvraagbaar.
  let availWindow: { start: string | null; end: string | null } | null = null
  if (eventDate) {
    const { data: dayRow } = await supabase
      .from("artist_availability")
      .select("status, start_time, end_time")
      .eq("artist_id", artistId)
      .eq("date", eventDate)
      .maybeSingle()
    if (dayRow?.status !== "available") {
      const { count } = await supabase
        .from("artist_availability")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", artistId)
        .eq("status", "available")
      const usesAgenda = (count ?? 0) > 0
      if (dayRow?.status === "booked" || usesAgenda) {
        redirect(`/artists/${artistId}?error=unavailable`)
      }
    } else {
      availWindow = { start: dayRow.start_time, end: dayRow.end_time }
    }
  }

  // Duur uit het tijdvak (halve uren). Het optreden moet binnen het
  // beschikbaarheidsvenster van de DJ vallen.
  if (!startTime || !endTime) {
    redirect(`/artists/${artistId}?error=time`)
  }
  const hours = rangeHours(startTime, endTime)
  if (
    hours <= 0 ||
    (availWindow &&
      !withinWindow(startTime, endTime, availWindow.start, availWindow.end))
  ) {
    redirect(`/artists/${artistId}?error=time`)
  }

  // Geen dubbele boeking op hetzelfde tijdvak: het gekozen tijdvak mag niet
  // overlappen met een reeds bevestigde boeking op die dag (incl. reistijd-
  // buffer). Via de service-role, want de boeker mag andermans boekingen niet
  // lezen; we halen alleen de tijden op, geen persoonsgegevens.
  const { data: sameDay } = await createAdminClient()
    .from("bookings")
    .select("start_time, end_time")
    .eq("artist_id", artistId)
    .eq("event_date", eventDate)
    .in("status", ["accepted", "paid", "completed"])
  const overlaps = (sameDay ?? []).some((bk) =>
    rangesOverlap(
      startTime!,
      endTime!,
      String(bk.start_time ?? "").slice(0, 5),
      String(bk.end_time ?? "").slice(0, 5),
      BOOKING_BUFFER_MIN,
    ),
  )
  if (overlaps) {
    redirect(`/artists/${artistId}?error=time`)
  }

  // Adresverificatie: het door de boeker gekozen adres opnieuw opzoeken bij
  // PDOK (server-side, niet te spoofen). Bestaat het niet → boeking blokkeren.
  const verified = addressId ? await pdokLookup(addressId) : null
  if (!verified) {
    redirect(`/artists/${artistId}?error=address`)
  }
  const city = verified.city

  // Btw-status van de DJ bepaalt of zakelijk btw krijgt (KOR = geen btw). Via de
  // service-role, want artist_billing is owner-only (de boeker mag het niet lezen);
  // deze vlag is geen gevoelige PII, alleen of er btw van toepassing is.
  const { data: djBilling } = await createAdminClient()
    .from("artist_billing")
    .select("is_vat_registered")
    .eq("artist_id", artistId)
    .maybeSingle()
  const djVatRegistered = djBilling?.is_vat_registered ?? false

  // Alleen de door de boeker gekozen DJ-apparatuur telt mee in het totaal.
  const selectedEquip = formData.getAll("dj_equipment").map(String)
  const prices = (artist.equipment_prices as Record<string, number> | null) ?? {}
  const equipmentCost = selectedEquip.reduce(
    (sum, i) => sum + (Number(prices[i]) || 0),
    0,
  )

  // Regelitems voor op de verkoopfactuur: alleen apparatuur met een prijs (die
  // dus in het totaal meetelt). Vorm: [{ item, price }].
  const equipmentItems = selectedEquip
    .map((item) => ({ item, price: Number(prices[item]) || 0 }))
    .filter((e) => e.price > 0)

  // Basisgage is een uurtarief; schaal mee met de gekozen duur.
  const { gage, commission, total: grossIncl } = priceBreakdown(
    Math.round(artist.base_gage * hours),
    equipmentCost,
  )
  // Particulier: gage + apparatuur is incl. btw. Zakelijk: alleen als de DJ
  // btw-plichtig is komt er 21% btw bovenop (KOR-DJ = geen btw, dus geen opslag).
  const total =
    bookingType === "zakelijk" && djVatRegistered
      ? Math.round(grossIncl * (1 + VAT_RATE) * 100) / 100
      : grossIncl

  const { error } = await supabase.from("bookings").insert({
    artist_id: artistId,
    booker_id: user.id,
    event_date: eventDate,
    city,
    venue_name: venue,
    address: verified.address,
    postal_code: verified.postalCode,
    lat: verified.lat,
    lng: verified.lng,
    address_verified: true,
    start_time: startTime,
    end_time: endTime,
    message,
    gage,
    service_fee: commission,
    total,
    hours,
    booking_type: bookingType,
    occasion,
    company_name: companyName,
    vat_number: vatNumber,
    invoice_email: invoiceEmail,
    equipment_items: equipmentItems,
  })

  if (error) {
    console.error("createBooking failed:", error.message)
    const { locale } = await getI18n()
    redirect(
      `/artists/${artistId}?error=${encodeURIComponent(dict[locale].bookingFailed)}`,
    )
  }

  // Nieuwe-aanvraag-mail naar de DJ. Best-effort — mag de boeking niet blokkeren.
  try {
    const djEmail = artist.user_id ? await getUserEmail(artist.user_id) : null
    if (djEmail) {
      const { locale } = await getI18n()
      const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
      await sendNewRequestToDJ({
        to: djEmail,
        locale,
        occasion: occasion ?? "",
        when: eventDate
          ? new Date(eventDate).toLocaleDateString(dateLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "",
        place: [city, venue].filter(Boolean).join(" · "),
        gage: formatEuro(gage),
      })
    }
  } catch (e) {
    console.error("new-request email failed:", e)
  }

  // Push-melding op het moment van boeken — naar de DJ én de organisator.
  // Best-effort: mag de boeking nooit blokkeren.
  try {
    await Promise.all([
      artist.user_id
        ? sendPushToUser(artist.user_id, {
            title: "Je hebt een boeking! 🎧",
            body: "Check je informatie en stuur een berichtje.",
            url: "/dashboard",
          })
        : null,
      sendPushToUser(user.id, {
        title: "Je boeking staat klaar!",
        body: "Check je informatie en stuur de DJ een berichtje.",
        url: "/bookings",
      }),
    ])
  } catch (e) {
    console.error("new-request push failed:", e)
  }

  redirect("/bookings?created=1")
}
