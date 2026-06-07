"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

export async function updateBookingStatus(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  const status = String(formData.get("status") ?? "") as BookingStatus

  const supabase = await createClient()
  await supabase.from("bookings").update({ status }).eq("id", bookingId)

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
