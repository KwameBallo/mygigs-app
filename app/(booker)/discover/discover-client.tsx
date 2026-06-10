"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { formatFollowers } from "@/lib/utils/format"
import { aiSearch } from "./ai-actions"
import type { MapPoint } from "./discover-map"
import type { Artist, Genre } from "@/lib/data/artists"
import type { Club } from "@/lib/data/events"

const AI_EXAMPLES = [
  "DJ met minimaal 20.000 volgers in omgeving Utrecht",
  "Techno DJ in Amsterdam met meer dan 1.000 volgers",
  "Online DJ in Rotterdam",
]

const DiscoverMap = dynamic(
  () => import("./discover-map").then((m) => m.DiscoverMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-muted">
        Kaart laden…
      </div>
    ),
  },
)

export function DiscoverClient({
  artists,
  clubs,
  genres,
  filters,
}: {
  artists: Artist[]
  clubs: Club[]
  genres: Genre[]
  filters: {
    q?: string
    genre?: string
    city?: string
    act?: string
    minFollowers?: string
    ai?: string
    type?: string
  }
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")

  const isClubs = filters.type === "clubs"

  const genreName = filters.genre
    ? genres.find((g) => String(g.id) === filters.genre)?.name
    : undefined
  const chips = [
    filters.minFollowers && Number(filters.minFollowers) > 0
      ? `≥ ${formatFollowers(Number(filters.minFollowers))} volgers`
      : null,
    filters.city ? `📍 ${filters.city}` : null,
    genreName ? `🎵 ${genreName}` : null,
    filters.q ? `"${filters.q}"` : null,
  ].filter(Boolean) as string[]

  // Kaartpunten: artiesten of clubs.
  const points: MapPoint[] = isClubs
    ? clubs
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({
          id: c.id,
          lat: c.lat as number,
          lng: c.lng as number,
          pin: "Club",
          title: c.name,
          meta: c.city ?? "Onbekend",
          href: `/clubs/${c.id}`,
          linkLabel: "Bekijk club",
        }))
    : artists
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          lat: a.lat as number,
          lng: a.lng as number,
          pin: `€${Math.round(a.base_gage)}`,
          title: a.stage_name,
          genre: a.genres?.name,
          meta: `${a.home_city ?? "Onbekend"} · ${formatEuro(a.base_gage)}`,
          href: `/artists/${a.id}`,
          linkLabel: "Bekijk profiel",
        }))

  const count = isClubs ? clubs.length : artists.length

  return (
    <div className="flex h-full flex-col">
      {/* Type-toggle: artiesten of clubs */}
      <div className="border-b border-border bg-surface px-4 pt-4">
        <div className="mx-auto flex max-w-6xl gap-2">
          <TypeTab label="DJ's" type="artists" filters={filters} active={!isClubs} />
          <TypeTab label="Clubs" type="clubs" filters={filters} active={isClubs} />
        </div>
      </div>

      {/* AI search bar (alleen voor artiesten) */}
      {!isClubs && (
        <div className="border-b border-border bg-surface px-4 py-4">
          <div className="mx-auto max-w-6xl">
            <form action={aiSearch} className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand">
                  ✦
                </span>
                <input
                  name="prompt"
                  defaultValue={filters.ai}
                  placeholder="Beschrijf wie je zoekt, bv. 'DJ met 20.000 volgers in Utrecht'"
                  className="input h-12 w-full pl-10"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
              >
                AI-zoeken
              </button>
            </form>

            {filters.ai && chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Begrepen als:</span>
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-brand"
                  >
                    {c}
                  </span>
                ))}
                <Link href="/discover" className="text-muted hover:text-foreground">
                  wissen
                </Link>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {AI_EXAMPLES.map((ex) => (
                  <form key={ex} action={aiSearch}>
                    <input type="hidden" name="prompt" value={ex} />
                    <button
                      type="submit"
                      className="rounded-full border border-border bg-surface-2 px-3 py-1 text-muted transition hover:border-brand/50 hover:text-foreground"
                    >
                      {ex}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="border-b border-border bg-background px-4 py-3">
        <form
          method="get"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-2"
        >
          {isClubs && <input type="hidden" name="type" value="clubs" />}
          {!isClubs && filters.minFollowers && (
            <input
              type="hidden"
              name="minFollowers"
              value={filters.minFollowers}
            />
          )}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Zoek op naam..."
            className="input h-10 flex-1 sm:max-w-xs"
          />
          <input
            name="city"
            defaultValue={filters.city}
            placeholder="Stad"
            className="input h-10 sm:max-w-[10rem]"
          />
          {!isClubs && (
            <select
              name="genre"
              defaultValue={filters.genre ?? ""}
              className="input h-10 sm:max-w-[10rem]"
            >
              <option value="">Alle genres</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
          >
            Zoek
          </button>
        </form>
      </div>

      {/* Split view */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* List */}
        <div
          className={`${
            view === "map" ? "hidden" : "flex"
          } w-full flex-col overflow-y-auto lg:flex lg:w-[440px] lg:flex-none lg:border-r lg:border-border`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-muted">
            <span>
              {count}{" "}
              {isClubs
                ? count === 1
                  ? "club"
                  : "clubs"
                : count === 1
                  ? "DJ"
                  : "DJ's"}
            </span>
            {!isClubs && (
              <Link
                href="/shortlist"
                className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-foreground transition hover:border-brand/50 hover:text-brand"
              >
                Meerdere tegelijk aanvragen
              </Link>
            )}
          </div>
          {count === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-medium">
                {isClubs ? "Geen clubs gevonden" : "Geen DJ's gevonden"}
              </p>
              <Link
                href={isClubs ? "/discover?type=clubs" : "/discover"}
                className="mt-2 inline-block text-sm text-brand"
              >
                Wis filters
              </Link>
            </div>
          ) : isClubs ? (
            <ul className="flex flex-col gap-2 px-3 pb-6">
              {clubs.map((c) => (
                <ClubCard
                  key={c.id}
                  club={c}
                  active={c.id === activeId}
                  onHover={() => setActiveId(c.id)}
                />
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2 px-3 pb-6">
              {artists.map((a) => (
                <ListCard
                  key={a.id}
                  artist={a}
                  active={a.id === activeId}
                  onHover={() => setActiveId(a.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Map */}
        <div
          className={`${
            view === "list" ? "hidden" : "block"
          } flex-1 lg:block`}
        >
          <DiscoverMap
            points={points}
            activeId={activeId}
            onActivate={setActiveId}
          />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setView(view === "list" ? "map" : "list")}
          className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-brand px-6 py-3 font-medium text-black shadow-lg transition hover:bg-brand-strong lg:hidden"
        >
          {view === "list" ? "Kaart" : "Lijst"}
        </button>
      </div>
    </div>
  )
}

function TypeTab({
  label,
  type,
  filters,
  active,
}: {
  label: string
  type: "artists" | "clubs"
  filters: { q?: string; city?: string }
  active: boolean
}) {
  const params = new URLSearchParams()
  if (type === "clubs") params.set("type", "clubs")
  if (filters.q) params.set("q", filters.q)
  if (filters.city) params.set("city", filters.city)
  const href = params.toString() ? `/discover?${params.toString()}` : "/discover"
  return (
    <Link
      href={href}
      className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-brand text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  )
}

function ListCard({
  artist,
  active,
  onHover,
}: {
  artist: Artist
  active: boolean
  onHover: () => void
}) {
  const initials = artist.stage_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <li>
      <Link
        href={`/artists/${artist.id}`}
        onMouseEnter={onHover}
        className={`flex gap-3 rounded-2xl border p-3 transition ${
          active
            ? "border-brand bg-brand/5"
            : "border-border bg-surface hover:border-brand/40"
        }`}
      >
        <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-surface-2">
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.avatar_url}
              alt={artist.stage_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {initials}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-1.5 font-semibold">
              <span className="truncate">{artist.stage_name}</span>
              {artist.verified && <VerifiedBadge />}
            </h3>
            {artist.online && (
              <span className="mt-1 h-2 w-2 flex-none rounded-full bg-green-400" />
            )}
          </div>
          {artist.home_city && (
            <p className="truncate text-sm text-muted">{artist.home_city}</p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <Stars rating={artist.rating} count={artist.reviews_count} />
            {artist.total_bookings > 0 && (
              <span className="text-xs text-muted">
                {artist.total_bookings}× geboekt
              </span>
            )}
            {artist.total_bookings === 0 && artist.instagram_followers > 0 && (
              <span className="text-xs text-muted">
                {formatFollowers(artist.instagram_followers)} volgers
              </span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {artist.genres && (
                <span className="truncate rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                  {artist.genres.name}
                </span>
              )}
            </div>
            <span className="flex-none font-semibold text-brand">
              {formatEuro(artist.base_gage)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

function VerifiedBadge() {
  return (
    <span
      title="Geverifieerde DJ"
      className="inline-flex flex-none items-center text-brand"
      aria-label="Geverifieerd"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="m12 1 2.4 1.8 3 .1 1 2.8 2.4 1.7-.8 2.9.8 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16l.8-2.9-.8-2.9 2.4-1.7 1-2.8 3-.1L12 1Z" />
        <path
          d="m8.5 12 2.3 2.3 4.7-4.7"
          fill="none"
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function ClubCard({
  club,
  active,
  onHover,
}: {
  club: Club
  active: boolean
  onHover: () => void
}) {
  const initials = club.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <li>
      <Link
        href={`/clubs/${club.id}`}
        onMouseEnter={onHover}
        className={`flex gap-3 rounded-2xl border p-3 transition ${
          active
            ? "border-brand bg-brand/5"
            : "border-border bg-surface hover:border-brand/40"
        }`}
      >
        <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-surface-2">
          {club.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.image_url}
              alt={club.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {initials}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-semibold">{club.name}</h3>
          {club.city && (
            <p className="truncate text-sm text-muted">{club.city}</p>
          )}
          {club.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted">
              {club.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              Club
            </span>
            {club.capacity != null && (
              <span className="text-xs text-muted">
                cap. {club.capacity}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
