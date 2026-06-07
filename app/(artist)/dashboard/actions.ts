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
