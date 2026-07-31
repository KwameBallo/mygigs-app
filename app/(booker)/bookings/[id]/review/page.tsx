import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"
import { ReviewForm } from "./review-form"

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/bookings/${id}/review`)

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, event_date, booker_id, artists(stage_name)")
    .eq("id", id)
    .eq("booker_id", user.id)
    .maybeSingle()
  if (!booking) notFound()

  const { locale } = await getI18n()
  const d = dict[locale]
  const artist = booking.artists as { stage_name: string } | null
  const djName = artist?.stage_name ?? "DJ"

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", id)
    .maybeSingle()

  const today = new Date().toISOString().slice(0, 10)
  const reviewable =
    booking.status === "completed" ||
    (booking.status === "paid" && booking.event_date < today)

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <Link
        href="/bookings"
        className="text-sm text-muted transition hover:text-foreground"
      >
        {d.back}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {d.title.replace("{dj}", djName)}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {d.subtitle.replace("{dj}", djName)}
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-surface p-6">
        {existing ? (
          <div>
            <p className="font-semibold text-brand">{d.alreadyTitle}</p>
            <p className="mt-1 text-sm text-muted">{d.alreadyBody}</p>
          </div>
        ) : !reviewable ? (
          <div>
            <p className="font-semibold">{d.notYetTitle}</p>
            <p className="mt-1 text-sm text-muted">{d.notYetBody}</p>
          </div>
        ) : (
          <ReviewForm bookingId={id} t={d} />
        )}
      </div>
    </main>
  )
}
