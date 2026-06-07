"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import type { Artist, Genre } from "@/lib/data/artists"

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
  filters: { q?: string; genre?: string; city?: string }
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="border-b border-border bg-background px-4 py-3">
        <form
          method="get"
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-2"
        >
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
          <div className="mt-1">
            <Stars rating={artist.rating} count={artist.reviews_count} />
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
