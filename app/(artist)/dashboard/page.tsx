import Link from "next/link"
import { redirect } from "next/navigation"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { BookingsBoard, type DashBooking } from "./bookings-board"

// Responstijd menselijk leesbaar.
function formatResponse(
  minutes: number,
  u: { min: string; hour: string; day: string; days: string },
) {
  if (minutes < 60) return `${minutes} ${u.min}`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} ${u.hour}`
  const d = Math.round(minutes / (60 * 24))
  return `${d} ${d === 1 ? u.day : u.days}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/dashboard")

  const { t } = await getI18n()
  const d = t.dashboard

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
    }
  })

  const pending = list.filter((b) => b.status === "pending")
  const accepted = list.filter((b) =>
    ["accepted", "paid", "completed"].includes(b.status),
  )
  const booked = list.filter((b) => ["paid", "completed"].includes(b.status))
  const earnings = booked.reduce((sum, b) => sum + b.gage, 0)

  // Profielvolledigheid: elke ontbrekende stap kost boekingen.
  const hasSocial = !!(
    artist.instagram_url ||
    artist.tiktok_url ||
    artist.spotify_url ||
    artist.soundcloud_url ||
    artist.mixcloud_url
  )
  const checks = [
    { label: d.checkPhoto, done: !!artist.avatar_url, href: "/profile" },
    { label: d.checkBio, done: !!artist.bio, href: "/profile" },
    { label: d.checkGage, done: artist.base_gage > 0, href: "/profile" },
    { label: d.checkGenre, done: artist.genre_id != null, href: "/profile" },
    { label: d.checkCity, done: !!artist.home_city, href: "/profile" },
    { label: d.checkSocial, done: hasSocial, href: "/profile" },
  ]
  const doneCount = checks.filter((c) => c.done).length
  const pct = Math.round((doneCount / checks.length) * 100)
  const missing = checks.filter((c) => !c.done)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
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

      {/* Profielvolledigheid: alleen tonen als nog niet 100%. */}
      {pct < 100 && (
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{d.completeTitle}</p>
              <p className="mt-0.5 text-sm text-muted">
                {d.completeBody.replace("{pct}", String(pct))}
              </p>
            </div>
            <Link
              href="/profile"
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              {d.finishProfile}
            </Link>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {missing.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {missing.map((c) => (
                <span
                  key={c.label}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted"
                >
                  + {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kerncijfers */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={d.statEarned} value={formatEuro(earnings)} />
        <Stat
          label={d.statOpen}
          value={String(pending.length)}
          accent={pending.length > 0}
        />
        <Stat label={d.statBookings30} value={String(artist.bookings_30d)} />
        <Stat
          label={d.statResponse}
          value={
            artist.response_minutes != null
              ? formatResponse(artist.response_minutes, {
                  min: d.respMin,
                  hour: d.respHour,
                  day: d.respDay,
                  days: d.respDays,
                })
              : "—"
          }
        />
      </div>

      {/* Funnel: aanvragen → geaccepteerd → geboekt */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-muted">{d.conversion}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-center">
          <FunnelStep label={d.funnelRequests} value={list.length} />
          <Arrow />
          <FunnelStep label={d.funnelAccepted} value={accepted.length} />
          <Arrow />
          <FunnelStep label={d.funnelBooked} value={booked.length} accent />
        </div>
        {list.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {d.conversionText.replace(
              "{pct}",
              String(Math.round((booked.length / list.length) * 100)),
            )}
          </p>
        )}
      </div>

      {/* Nudges: agenda + adverteren */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(openDays ?? 0) === 0 ? (
          <NudgeCard
            title={d.nudgeAgendaEmptyTitle}
            body={d.nudgeAgendaEmptyBody}
            cta={d.nudgeAgendaCta}
            href="/availability"
          />
        ) : (
          <NudgeCard
            title={d.nudgeAgendaFullTitle.replace("{n}", String(openDays))}
            body={d.nudgeAgendaFullBody}
            cta={d.nudgeAgendaManage}
            href="/availability"
            soft
          />
        )}
        <NudgeCard
          title={d.nudgeAdTitle}
          body={d.nudgeAdBody}
          cta={d.nudgeAdCta}
          href="/advertise"
        />
      </div>

      <BookingsBoard bookings={dashBookings} />
    </main>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-5 ${
        accent ? "border-brand/50" : "border-border"
      }`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${accent ? "text-brand" : ""}`}
      >
        {value}
      </p>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="flex-1">
      <p className={`text-2xl font-semibold ${accent ? "text-brand" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Arrow() {
  return <span className="flex-none text-muted">→</span>
}

function NudgeCard({
  title,
  body,
  cta,
  href,
  soft,
}: {
  title: string
  body: string
  cta: string
  href: string
  soft?: boolean
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 flex-1 text-sm text-muted">{body}</p>
      <Link
        href={href}
        className={`mt-4 inline-block self-start rounded-full px-4 py-2 text-sm font-medium transition ${
          soft
            ? "border border-border hover:border-brand/50"
            : "bg-brand text-black hover:bg-brand-strong"
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}
