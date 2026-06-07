import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Stars } from "@/components/stars"
import { BookForm } from "./book-form"
import { getArtist, getArtistReviews } from "@/lib/data/artists"
import { getProfile } from "@/lib/auth"

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [artist, reviews, profile] = await Promise.all([
    getArtist(id),
    getArtistReviews(id),
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
    { label: "Spotify", url: artist.spotify_url },
    { label: "SoundCloud", url: artist.soundcloud_url },
    { label: "Mixcloud", url: artist.mixcloud_url },
  ].filter((l) => l.url)

  return (
    <>
      <SiteHeader />
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
          </aside>
        </div>
      </main>
    </>
  )
}
