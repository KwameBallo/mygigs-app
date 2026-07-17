import Link from "next/link"
import { redirect } from "next/navigation"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { BookingsBoard, type DashBooking } from "./bookings-board"

// Responstijd menselijk leesbaar.
function formatResponse(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} uur`
  const d = Math.round(minutes / (60 * 24))
  return `${d} ${d === 1 ? "dag" : "dagen"}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/dashboard")

  const { data: artist } = await supabase
    .from("artists")
    .select("*, genres!artists_genre_id_fkey(name)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Maak je DJ-profiel
        </h1>
        <p className="mt-3 text-muted">
          Je account heeft nog geen gekoppeld DJ-profiel. Zodra dit is
          aangemaakt, zie je hier je aanvragen, agenda en verdiensten.
        </p>
        <Link
          href="/profile"
          className="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
        >
          Profiel aanmaken
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
    { label: "Profielfoto", done: !!artist.avatar_url, href: "/profile" },
    { label: "Bio", done: !!artist.bio, href: "/profile" },
    { label: "Gage instellen", done: artist.base_gage > 0, href: "/profile" },
    { label: "Genre", done: artist.genre_id != null, href: "/profile" },
    { label: "Thuisstad", done: !!artist.home_city, href: "/profile" },
    { label: "Social link", done: hasSocial, href: "/profile" },
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
          Bekijk publiek profiel
        </Link>
      </div>

      {/* Profielvolledigheid: alleen tonen als nog niet 100%. */}
      {pct < 100 && (
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Maak je profiel compleet</p>
              <p className="mt-0.5 text-sm text-muted">
                Complete profielen worden vaker geboekt. Je bent op {pct}%.
              </p>
            </div>
            <Link
              href="/profile"
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              Profiel afmaken
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
        <Stat label="Verdiend" value={formatEuro(earnings)} />
        <Stat
          label="Open aanvragen"
          value={String(pending.length)}
          accent={pending.length > 0}
        />
        <Stat label="Boekingen (30d)" value={String(artist.bookings_30d)} />
        <Stat
          label="Reactietijd"
          value={
            artist.response_minutes != null
              ? formatResponse(artist.response_minutes)
              : "—"
          }
        />
      </div>

      {/* Funnel: aanvragen → geaccepteerd → geboekt */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-semibold text-muted">Jouw conversie</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-center">
          <FunnelStep label="Aanvragen" value={list.length} />
          <Arrow />
          <FunnelStep label="Geaccepteerd" value={accepted.length} />
          <Arrow />
          <FunnelStep label="Geboekt" value={booked.length} accent />
        </div>
        {list.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Je zet {Math.round((booked.length / list.length) * 100)}% van je
            aanvragen om in een betaalde boeking.
          </p>
        )}
      </div>

      {/* Nudges: agenda + adverteren */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(openDays ?? 0) === 0 ? (
          <NudgeCard
            title="Zet je agenda open"
            body="Je hebt geen beschikbare dagen gemarkeerd. Boekers vinden je makkelijker als je agenda gevuld is."
            cta="Naar agenda"
            href="/availability"
          />
        ) : (
          <NudgeCard
            title={`${openDays} dagen beschikbaar`}
            body="Je agenda staat open. Houd hem actueel zodat boekers de juiste data zien."
            cta="Beheer agenda"
            href="/availability"
            soft
          />
        )}
        <NudgeCard
          title="Val extra op"
          body="Promoot jezelf met een banner op de ontdek-pagina en de agenda. Je betaalt per week, los van je boekingen."
          cta="Plaats advertentie"
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
