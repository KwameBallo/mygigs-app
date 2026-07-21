import Link from "next/link"
import { notFound } from "next/navigation"
import { Stars } from "@/components/stars"
import { BookForm } from "./book-form"
import { EquipmentPlanner, type MiniSupplier } from "./equipment-planner"
import { EquipmentSelectionProvider } from "./equipment-selection"
import { getArtist, getArtistReviews, getPublicShows } from "@/lib/data/artists"
import { getSuppliers, type Supplier } from "@/lib/data/suppliers"
import { getViewer } from "@/lib/auth"
import { formatFollowers } from "@/lib/utils/format"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"

type Dict = (typeof dict)["nl"]

function formatShowDate(date: string, months: string[]) {
  const d = new Date(date)
  return { day: d.getDate(), month: months[d.getMonth()] }
}

// Responstijd menselijk leesbaar: "binnen 30 min", "binnen 2 uur", "binnen 1 dag".
function formatResponse(minutes: number, d: Dict) {
  if (minutes < 60) return d.respWithinMin.replace("{n}", String(minutes))
  if (minutes < 60 * 24) {
    const h = Math.round(minutes / 60)
    return d.respWithinHours.replace("{n}", String(h))
  }
  const days = Math.round(minutes / (60 * 24))
  const tmpl = days === 1 ? d.respWithinDay : d.respWithinDays
  return tmpl.replace("{n}", String(days))
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { locale } = await getI18n()
  const d = dict[locale]
  const [artist, reviews, shows, viewer] = await Promise.all([
    getArtist(id),
    getArtistReviews(id),
    getPublicShows(id),
    getViewer(),
  ])
  const { profile, emailConfirmed } = viewer

  if (!artist) notFound()

  // Verhuur aanbieden zodra de DJ minstens één geluid- of licht-item mist.
  const SOUND_ITEMS = ["Microfoon", "Draaitafel", "Speakers", "Bass"]
  const items = artist.equipment_items ?? []
  const missingSound = SOUND_ITEMS.some((i) => !items.includes(i))
  const missingLight = !items.includes("Verlichting")
  const [soundSuppliers, lightSuppliers] = await Promise.all([
    missingSound ? getSuppliers({ category: "sound" }) : Promise.resolve<Supplier[]>([]),
    missingLight ? getSuppliers({ category: "light" }) : Promise.resolve<Supplier[]>([]),
  ])
  const toMini = (s: Supplier): MiniSupplier => ({
    id: s.id,
    name: s.name,
    city: s.city,
    day_rate: s.day_rate,
    image_url: s.image_url,
  })

  // Huurprijzen van de apparatuur die de DJ meeneemt (de consument kiest
  // hieruit; alleen het gekozene telt in de prijs).
  const equipmentPrices: Record<string, number> =
    (artist.equipment_prices as Record<string, number> | null) ?? {}

  const initials = artist.stage_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const links = [
    { label: "Instagram", url: artist.instagram_url },
    { label: "TikTok", url: artist.tiktok_url },
    { label: "Spotify", url: artist.spotify_url },
    { label: "SoundCloud", url: artist.soundcloud_url },
    { label: "Mixcloud", url: artist.mixcloud_url },
  ].filter((l) => l.url)

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link href="/discover" className="text-sm text-muted hover:text-foreground">
          {d.backToDiscover}
        </Link>

        <EquipmentSelectionProvider prices={equipmentPrices}>
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 sm:aspect-[16/9]">
                {artist.avatar_url ? (
                  <>
                    {/* Vervaagde vulling: dezelfde foto, zodat de zijkanten van
                        een staande foto niet leeg/afgesneden ogen. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artist.avatar_url}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
                    />
                    {/* De volledige foto, nooit afgesneden. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artist.avatar_url}
                      alt={artist.stage_name}
                      className="relative h-full w-full object-contain"
                    />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-muted">
                    {initials}
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {artist.stage_name}
                  </h1>
                  {artist.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-medium text-black">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="m12 1 2.4 1.8 3 .1 1 2.8 2.4 1.7-.8 2.9.8 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16l.8-2.9-.8-2.9 2.4-1.7 1-2.8 3-.1L12 1Z" />
                        <path d="m8.5 12 2.3 2.3 4.7-4.7" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {d.verified}
                    </span>
                  )}
                  {artist.genres && (
                    <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                      {artist.genres.name}
                    </span>
                  )}
                  {artist.online && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      {d.online}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <Stars rating={artist.rating} count={artist.reviews_count} />
                  {artist.home_city && <span>{artist.home_city}</span>}
                  {artist.total_bookings > 0 && (
                    <span className="font-medium text-foreground">
                      {d.bookedViaMyGigs.replace("{n}", String(artist.total_bookings))}
                    </span>
                  )}
                  {artist.response_minutes != null && (
                    <span>
                      {d.responds.replace(
                        "{r}",
                        formatResponse(artist.response_minutes, d),
                      )}
                    </span>
                  )}
                  {artist.instagram_followers > 0 && (
                    <span>
                      {d.followersInstagram.replace(
                        "{n}",
                        formatFollowers(artist.instagram_followers),
                      )}
                    </span>
                  )}
                  {artist.tiktok_followers > 0 && (
                    <span>
                      {d.followersTiktok.replace(
                        "{n}",
                        formatFollowers(artist.tiktok_followers),
                      )}
                    </span>
                  )}
                </div>
                {artist.bio && (
                  <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">
                    {artist.bio}
                  </p>
                )}
                <EquipmentPlanner
                  equipmentItems={artist.equipment_items ?? []}
                  equipmentPrices={equipmentPrices}
                  equipmentText={artist.equipment}
                  soundSuppliers={soundSuppliers.slice(0, 3).map(toMini)}
                  lightSuppliers={lightSuppliers.slice(0, 3).map(toMini)}
                />
                {links.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {links.map((l) => (
                      <a
                        key={l.label}
                        href={l.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-surface-2 px-4 py-2 text-sm transition hover:border-brand/50"
                      >
                        {l.label} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {reviews.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold tracking-tight">{d.reviews}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {r.reviewer_name ?? d.anonymous}
                        </span>
                        <Stars rating={r.rating} />
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-sm text-muted">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookForm
              artistId={artist.id}
              baseGage={artist.base_gage}
              isLoggedIn={!!profile}
              emailConfirmed={emailConfirmed}
              company={
                profile
                  ? {
                      name: profile.company_name,
                      vat: profile.vat_number,
                      email: profile.invoice_email,
                    }
                  : undefined
              }
            />

            <section className="mt-6 rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                {d.upcomingShows}
              </h2>
              {shows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {d.noPublicShows}
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {shows.map((show) => {
                    const { day, month } = formatShowDate(show.event_date, d.months)
                    return (
                      <li
                        key={show.id}
                        className="flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-3"
                      >
                        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-surface text-center">
                          <span className="text-base font-semibold leading-none">
                            {day}
                          </span>
                          <span className="text-[10px] uppercase text-muted">
                            {month}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {show.venue_name ?? d.venueTbd}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {[show.city, show.start_time?.slice(0, 5)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
        </EquipmentSelectionProvider>
    </main>
  )
}
