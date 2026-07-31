"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

export type ReviewState = { error?: "rating" | "generic" }

function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const bookingId = String(formData.get("booking_id") ?? "")
  const rating = Math.round(Number(formData.get("rating")))
  const comment =
    String(formData.get("comment") ?? "").trim().slice(0, 1000) || null

  if (!bookingId) return { error: "generic" }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5)
    return { error: "rating" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/bookings/${bookingId}/review`)

  // De boeking moet van deze boeker zijn en het optreden moet geweest zijn
  // (status 'completed', of 'paid' met een verstreken datum).
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, artist_id, booker_id, status, event_date")
    .eq("id", bookingId)
    .eq("booker_id", user.id)
    .maybeSingle()
  if (!booking) redirect("/bookings")
  const reviewable =
    booking.status === "completed" ||
    (booking.status === "paid" && booking.event_date < today())
  if (!reviewable) redirect("/bookings")

  const admin = createAdminClient()

  // Eén review per boeking.
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle()
  if (existing) redirect("/bookings?reviewed=1")

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const { error } = await admin.from("reviews").insert({
    artist_id: booking.artist_id,
    booker_id: user.id,
    booking_id: bookingId,
    rating,
    comment,
    reviewer_name: profile?.full_name ?? null,
  })
  if (error) return { error: "generic" }

  // Rating + reviews_count herberekenen (er is geen DB-trigger hiervoor).
  const { data: all } = await admin
    .from("reviews")
    .select("rating")
    .eq("artist_id", booking.artist_id)
  const ratings = (all ?? []).map((r) => Number(r.rating))
  const count = ratings.length
  const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0
  await admin
    .from("artists")
    .update({ rating: Math.round(avg * 100) / 100, reviews_count: count })
    .eq("id", booking.artist_id)

  await logAudit({
    actorId: user.id,
    action: "review.created",
    targetType: "booking",
    targetId: bookingId,
    metadata: { rating },
  })

  redirect("/bookings?reviewed=1")
}
