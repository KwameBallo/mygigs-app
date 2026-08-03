"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { getI18n } from "@/lib/i18n"
import { formatEuro } from "@/lib/utils/pricing"
import { sendAcceptedToBooker, getUserEmail } from "@/lib/email"
import { haversineMeters } from "@/lib/geo"
import type { Database } from "@/types/database"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

// Statussen die een DJ zelf mag zetten. 'paid' zit hier bewust NIET tussen —
// dat kan alleen via betaling (payBooking); 'cancelled' hoort bij de boeker.
const DJ_ALLOWED_STATUS = ["accepted", "declined", "completed"] as const

export async function updateBookingStatus(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  const statusRaw = String(formData.get("status") ?? "")
  if (!(DJ_ALLOWED_STATUS as readonly string[]).includes(statusRaw)) return
  const status = statusRaw as BookingStatus

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Verifieer dat de boeking bij de ingelogde DJ hoort.
  const { data: artist } = await supabase
    .from("artists")
    .select("id, stage_name")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_date, booker_id, city, venue_name, total")
    .eq("id", bookingId)
    .eq("artist_id", artist.id)
    .maybeSingle()
  if (!booking) return

  // Status wordt server-side gezet via de service-role (client mag 'status' niet
  // meer schrijven); de filter op artist_id borgt dat het de eigen boeking is.
  await createAdminClient()
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("artist_id", artist.id)

  await logAudit({
    actorId: user.id,
    action: "booking.status",
    targetType: "booking",
    targetId: bookingId,
    metadata: { status },
  })

  // Accepteren = die dag is geboekt → blokkeer 'm in je agenda/Ontdek.
  if (status === "accepted") {
    await supabase
      .from("artist_availability")
      .delete()
      .eq("artist_id", artist.id)
      .eq("date", booking.event_date)
    await supabase.from("artist_availability").insert({
      artist_id: artist.id,
      date: booking.event_date,
      status: "booked",
    })

    // Mail de boeker dat de aanvraag is geaccepteerd (met betaal-CTA). Best-effort.
    try {
      const bookerEmail = await getUserEmail(booking.booker_id)
      if (bookerEmail) {
        const { locale } = await getI18n()
        const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
        await sendAcceptedToBooker({
          to: bookerEmail,
          locale,
          djName: artist.stage_name,
          when: new Date(booking.event_date).toLocaleDateString(dateLocale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          place: [booking.city, booking.venue_name].filter(Boolean).join(" · "),
          amount: formatEuro(booking.total),
        })
      }
    } catch (e) {
      console.error("accepted email failed:", e)
    }
  }

  // Het review-verzoek gaat NIET hier, maar automatisch ~3 uur na het einde van
  // het optreden via de geplande taak (/api/cron/review-requests) — zie
  // migratie 0022. Zo is de timing onafhankelijk van of de DJ handmatig afrondt.

  revalidatePath("/dashboard")
  revalidatePath("/availability")
  revalidatePath("/discover")
}

// Aanwezigheidsbewijs: de DJ legt bij aankomst zijn GPS + tijdstip vast. We
// berekenen de afstand tot het geverifieerde event-adres en bewaren die als
// bewijs. AVG: locatie is persoonsgegeven — de UI vraagt eerst toestemming en
// de gegevens zijn alleen zichtbaar voor de betrokken DJ en boeker.
export async function checkInBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  const lat = Number(formData.get("lat"))
  const lng = Number(formData.get("lng"))
  const accuracy = Number(formData.get("accuracy"))
  if (!bookingId || !Number.isFinite(lat) || !Number.isFinite(lng)) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, lat, lng, checkin_at")
    .eq("id", bookingId)
    .eq("artist_id", artist.id)
    .maybeSingle()
  if (!booking) return
  // Alleen bij een bevestigde boeking, en niet dubbel inchecken.
  if (!["accepted", "paid", "completed"].includes(booking.status)) return
  if (booking.checkin_at) return

  // Afstand tot het event-adres (indien we coördinaten hebben).
  const distance =
    booking.lat != null && booking.lng != null
      ? haversineMeters(lat, lng, Number(booking.lat), Number(booking.lng))
      : null

  await createAdminClient()
    .from("bookings")
    .update({
      checkin_at: new Date().toISOString(),
      checkin_lat: lat,
      checkin_lng: lng,
      checkin_accuracy_m: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
      checkin_distance_m: distance,
    })
    .eq("id", bookingId)
    .eq("artist_id", artist.id)

  await logAudit({
    actorId: user.id,
    action: "booking.checkin",
    targetType: "booking",
    targetId: bookingId,
    metadata: { distance_m: distance, accuracy_m: accuracy },
  })

  revalidatePath("/dashboard")
}

export async function toggleBookingPublic(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  const isPublic = String(formData.get("is_public") ?? "") === "true"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return

  await supabase
    .from("bookings")
    .update({ is_public: isPublic })
    .eq("id", bookingId)
    .eq("artist_id", artist.id)

  revalidatePath("/dashboard")
}
