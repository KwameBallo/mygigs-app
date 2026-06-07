import Link from "next/link"
import { notFound } from "next/navigation"
import { Stars } from "@/components/stars"
import { BookForm } from "./book-form"
import { getArtist, getArtistReviews, getPublicShows } from "@/lib/data/artists"
import { getProfile } from "@/lib/auth"
import { formatFollowers } from "@/lib/utils/format"

const MONTHS = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
]

function formatShowDate(date: string) {
  const d = new Date(date)
  return { day: d.getDate(), month: MONTHS[d.getMonth()] }
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [artist, reviews, shows, profile] = await Promise.all([
    getArtist(id),
    getArtistReviews(id),
    getPublicShows(id),
    getProfile(),
  ])

  if (!artist) notFound()

  const initials = artist.stage_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const links = [
    { label: "Instagram", url: artist.instagram_url },
    { label: "Spotify", url: artist.spotify_url },
    { label: "SoundCloud", url: artist.soundcloud_url },
    { label: "Mixcloud", url: artist.mixcloud_url },
  ].filter((l) => l.url)

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link href="/discover" className="text-sm text-muted hover:text-foreground">
          ← Terug naar ontdekken
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <div className="relative aspect-[16/9] bg-surface-2">
                {artist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artist.avatar_url}
                    alt={artist.stage_name}
                    className="h-full w-full object-cover"
                  />
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
                  {artist.genres && (
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-black">
                      {artist.genres.name}
                    </span>
                  )}
                  {artist.online && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      Online
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <Stars rating={artist.rating} count={artist.reviews_count} />
                  {artist.home_city && <span>{artist.home_city}</span>}
                  {artist.instagram_followers > 0 && (
                    <span>
                      {formatFollowers(artist.instagram_followers)} volgers
                    </span>
                  )}
                  <span>{artist.bookings_30d} boekingen (30d)</span>
                </div>
                {artist.bio && (
                  <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">
                    {artist.bio}
                  </p>
                )}
                {artist.equipment && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold">Apparatuur</h3>
                    <p className="mt-1 text-sm text-muted">{artist.equipment}</p>
                  </div>
                )}
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
                <h2 className="text-xl font-semibold tracking-tight">Reviews</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {r.reviewer_name ?? "Anoniem"}
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
            />

            <section className="mt-6 rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                Aankomende shows
              </h2>
              {shows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Geen openbare optredens gepland.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {shows.map((show) => {
                    const { day, month } = formatShowDate(show.event_date)
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
                            {show.venue_name ?? "Locatie volgt"}
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
    </main>
  )
}
