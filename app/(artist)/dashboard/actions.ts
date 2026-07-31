"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { getI18n } from "@/lib/i18n"
import { formatEuro } from "@/lib/utils/pricing"
import { sendAcceptedToBooker, getUserEmail } from "@/lib/email"
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

  revalidatePath("/dashboard")
  revalidatePath("/availability")
  revalidatePath("/discover")
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
