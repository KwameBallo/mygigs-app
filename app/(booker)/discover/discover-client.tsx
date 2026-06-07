"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { formatFollowers } from "@/lib/utils/format"
import { aiSearch } from "./ai-actions"
import type { Artist, Genre } from "@/lib/data/artists"

const AI_EXAMPLES = [
  "Artiest met minimaal 20.000 volgers in omgeving Utrecht",
  "Techno DJ in Amsterdam met meer dan 1.000 volgers",
  "Online artiest in Rotterdam",
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
  genres,
  filters,
}: {
  artists: Artist[]
  genres: Genre[]
  filters: {
    q?: string
    genre?: string
    city?: string
    minFollowers?: string
    ai?: string
  }
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")

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

  return (
    <div className="flex h-full flex-col">
      {/* AI search bar */}
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
                placeholder="Beschrijf wie je zoekt, bv. 'artiest met 20.000 volgers in Utrecht'"
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

      {/* Filter bar */}
      <div className="border-b border-border bg-background px-4 py-3">
        <form
          method="get"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-2"
        >
          {filters.minFollowers && (
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
          <div className="px-4 py-3 text-sm text-muted">
            {artists.length} {artists.length === 1 ? "artiest" : "artiesten"}
          </div>
          {artists.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-medium">Geen artiesten gevonden</p>
              <Link href="/discover" className="mt-2 inline-block text-sm text-brand">
                Wis filters
              </Link>
            </div>
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
            artists={artists}
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
            <h3 className="truncate font-semibold">{artist.stage_name}</h3>
            {artist.online && (
              <span className="mt-1 h-2 w-2 flex-none rounded-full bg-green-400" />
            )}
          </div>
          {artist.home_city && (
            <p className="truncate text-sm text-muted">{artist.home_city}</p>
          )}
          <div className="mt-1 flex items-center gap-3">
            <Stars rating={artist.rating} count={artist.reviews_count} />
            {artist.instagram_followers > 0 && (
              <span className="text-xs text-muted">
                {formatFollowers(artist.instagram_followers)} volgers
              </span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between pt-1">
            {artist.genres && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                {artist.genres.name}
              </span>
            )}
            <span className="font-semibold text-brand">
              {formatEuro(artist.base_gage)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}
