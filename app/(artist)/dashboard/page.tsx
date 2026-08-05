import Link from "next/link"
import { redirect } from "next/navigation"
import { Stars } from "@/components/stars"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { BookingsBoard, type DashBooking } from "./bookings-board"
import { BookingsMapSection } from "./bookings-map-section"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/dashboard")

  const { locale, t } = await getI18n()
  const d = t.dashboard
  const mp = t.map
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const { data: artist } = await supabase
    .from("artists")
    .select("*, genres!artists_genre_id_fkey(name)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {d.noProfileTitle}
        </h1>
        <p className="mt-3 text-muted">{d.noProfileBody}</p>
        <Link
          href="/profile"
          className="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
        >
          {d.createProfile}
        </Link>
      </main>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const [{ data: bookings }, { count: openDays }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, booker:profiles!bookings_booker_id_fkey(full_name)")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("artist_availability")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id)
      .eq("status", "available")
      .gte("date", today),
  ])

  const list = bookings ?? []
  const dashBookings: DashBooking[] = list.map((b) => {
    // Supabase kan een embedded to-one als object óf 1-element-array teruggeven.
    const booker = Array.isArray(b.booker) ? b.booker[0] : b.booker
    return {
      id: b.id,
      status: b.status,
      event_date: b.event_date,
      city: b.city,
      venue_name: b.venue_name,
      address: b.address,
      postal_code: b.postal_code,
      lat: b.lat,
      lng: b.lng,
      message: b.message,
      gage: b.gage,
      service_fee: b.service_fee,
      total: b.total,
      hours: b.hours,
      booking_type: b.booking_type,
      occasion: b.occasion,
      company_name: b.company_name,
      start_time: b.start_time,
      end_time: b.end_time,
      booker_name: booker?.full_name ?? null,
      is_public: b.is_public,
      created_at: b.created_at,
      enroute_at: b.enroute_at,
      eta: b.eta,
      checkin_at: b.checkin_at,
      checkin_distance_m: b.checkin_distance_m,
      checkin_accuracy_m: b.checkin_accuracy_m,
      checkin_verified: b.checkin_verified,
      booker_confirmed_at: b.booker_confirmed_at,
    }
  })

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {artist.stage_name}
          </h1>
          <div className="mt-2">
            <Stars rating={artist.rating} count={artist.reviews_count} />
          </div>
        </div>
        <Link
          href={`/artists/${artist.id}`}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:border-brand/50"
        >
          {d.viewPublic}
        </Link>
      </div>

      {/* Slanke aansporing: alleen als de agenda nog dicht staat (dan kom je
          niet in beeld bij boekers). Verdiensten en cijfers staan bij Verdiensten. */}
      {(openDays ?? 0) === 0 && (
        <Link
          href="/availability"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-brand/5 p-4 transition hover:border-brand/60"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold">{d.nudgeAgendaEmptyTitle}</p>
            <p className="mt-0.5 text-xs text-muted">{d.nudgeAgendaEmptyBody}</p>
          </div>
          <span className="flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black">
            {d.nudgeAgendaCta}
          </span>
        </Link>
      )}

      <BookingsBoard bookings={dashBookings} />

      <BookingsMapSection
        bookings={list.map((b) => ({
          id: b.id,
          city: b.city,
          venue_name: b.venue_name,
          event_date: b.event_date,
          status: b.status,
          lat: b.lat,
          lng: b.lng,
        }))}
        dateLocale={dateLocale}
        labels={{
          title: mp.title,
          legendPending: mp.legendPending,
          legendAccepted: mp.legendAccepted,
          legendPaid: mp.legendPaid,
          empty: mp.empty,
          statusPending: mp.statusPending,
          statusAccepted: mp.statusAccepted,
          statusPaid: mp.statusPaid,
          statusCompleted: mp.statusCompleted,
        }}
      />
    </main>
  )
}
