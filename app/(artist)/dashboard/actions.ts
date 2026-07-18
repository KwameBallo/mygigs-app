"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import type { Database } from "@/types/database"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

export async function updateBookingStatus(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  const status = String(formData.get("status") ?? "") as BookingStatus

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Verifieer dat de boeking bij de ingelogde DJ hoort.
  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, event_date")
    .eq("id", bookingId)
    .eq("artist_id", artist.id)
    .maybeSingle()
  if (!booking) return

  await supabase
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
