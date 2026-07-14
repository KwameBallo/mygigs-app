"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Opent (of maakt) het gesprek dat bij een boeking hoort en stuurt de
// gebruiker naar de chat. Alleen de betrokken DJ en boeker mogen erin.
export async function openBookingChat(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "")
  if (!bookingId) redirect("/bookings")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, artist_id, booker_id")
    .eq("id", bookingId)
    .maybeSingle()
  if (!booking) redirect("/bookings")

  // Alleen de boeker of de eigenaar van het DJ-profiel mogen chatten.
  const { data: artist } = await supabase
    .from("artists")
    .select("user_id")
    .eq("id", booking.artist_id)
    .maybeSingle()
  const isParticipant =
    booking.booker_id === user.id || artist?.user_id === user.id
  if (!isParticipant) redirect("/")

  // Gesprek zoeken of aanmaken (service-role: omzeilt RLS voor het aanmaken).
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle()

  let conversationId = existing?.id as string | undefined
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({
        artist_id: booking.artist_id,
        booker_id: booking.booker_id,
        booking_id: booking.id,
      })
      .select("id")
      .single()
    conversationId = created?.id
  }

  redirect(conversationId ? `/messages/${conversationId}` : "/bookings")
}
