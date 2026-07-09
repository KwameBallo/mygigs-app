"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { formatFollowers } from "@/lib/utils/format"
import { haversineKm } from "@/lib/utils/geo"
import { PROVINCES } from "@/lib/utils/provinces"
import { aiSearch } from "./ai-actions"
import type { MapPoint } from "./discover-map"
import type { Artist, Genre } from "@/lib/data/artists"
import type { Club } from "@/lib/data/events"

const AI_EXAMPLES = [
  "DJ met 20.000 volgers in Utrecht",
  "Techno DJ in Amsterdam",
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

type Filters = {
  q?: string
  genre?: string
  city?: string
  province?: string
  equipment?: string
  act?: string
  minFollowers?: string
  budget?: string
  rating?: string
  date?: string
  ai?: string
  type?: string
}

const EQUIPMENT_LABELS: Record<string, string> = {
  sound: "🔊 Brengt geluid mee",
  light: "💡 Brengt licht mee",
}

// Prijs die de boeker betaalt: provinciebedrag indien gefilterd, anders basis.
function priceFor(a: Artist): number {
  return a.province_gage ?? a.base_gage
}

export function DiscoverClient({
  artists,
  clubs,
  genres,
  filters,
}: {
  artists: Artist[]
  clubs: Club[]
  genres: Genre[]
  filters: Filters
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [aiOpen, setAiOpen] = useState(Boolean(filters.ai))
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(
      filters.genre ||
        filters.budget ||
        filters.rating ||
        filters.date ||
        filters.province ||
        filters.equipment,
    ),
  )
  const [maxKm, setMaxKm] = useState<number | null>(null)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [geoError, setGeoError] = useState<string | null>(null)

  function onDistance(value: string) {
    const km = value ? Number(value) : null
    setMaxKm(km)
    setGeoError(null)
    if (km != null && !userPos) {
      if (!navigator.geolocation) {
        setGeoError("Locatie niet ondersteund")
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeoError("Zet locatie aan om op afstand te filteren"),
        { enableHighAccuracy: false, timeout: 8000 },
      )
    }
  }

  const isClubs = filters.type === "clubs"

  const genreName = filters.genre
    ? genres.find((g) => String(g.id) === filters.genre)?.name
    : undefined
  const chips = [
    filters.minFollowers && Number(filters.minFollowers) > 0
      ? `≥ ${formatFollowers(Number(filters.minFollowers))} volgers`
      : null,
    filters.city ? `📍 ${filters.city}` : null,
    filters.province ? `🗺️ ${filters.province}` : null,
    genreName ? `🎵 ${genreName}` : null,
    filters.equipment ? EQUIPMENT_LABELS[filters.equipment] : null,
  ].filter(Boolean) as string[]

  // Afstand-filter (client-side, o.b.v. je locatie).
  const shownArtists =
    maxKm != null && userPos
      ? artists
          .filter(
            (a) =>
              a.lat != null &&
              a.lng != null &&
              haversineKm(userPos, { lat: a.lat, lng: a.lng }) <= maxKm,
          )
          .sort(
            (a, b) =>
              haversineKm(userPos, {
                lat: a.lat as number,
                lng: a.lng as number,
              }) -
              haversineKm(userPos, {
                lat: b.lat as number,
                lng: b.lng as number,
              }),
          )
      : artists

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
    : shownArtists
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          lat: a.lat as number,
          lng: a.lng as number,
          pin: `€${Math.round(priceFor(a))}`,
          title: a.stage_name,
          genre: a.genres?.name,
          meta: `${a.home_city ?? "Onbekend"} · ${formatEuro(priceFor(a))}`,
          href: `/artists/${a.id}`,
          linkLabel: "Bekijk profiel",
        }))

  const count = isClubs ? clubs.length : shownArtists.length
  const countLabel = `${count} ${
    isClubs ? (count === 1 ? "club" : "clubs") : count === 1 ? "DJ" : "DJ's"
  }`

  const results =
    count === 0 ? (
      <div className="m-3 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
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
    ) : (
      <ul className="flex flex-col gap-2 p-3">
        {isClubs
          ? clubs.map((c) => (
              <ClubCard
                key={c.id}
                club={c}
                active={c.id === activeId}
                onHover={() => setActiveId(c.id)}
              />
            ))
          : shownArtists.map((a) => (
              <ListCard
                key={a.id}
                artist={a}
                active={a.id === activeId}
                onHover={() => setActiveId(a.id)}
              />
            ))}
      </ul>
    )

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Full-bleed kaart als achtergrond */}
      <div className="absolute inset-0 z-0">
        <DiscoverMap
          points={points}
          activeId={activeId}
          onActivate={setActiveId}
        />
      </div>

      {/* Eén zwevende zoekbalk bovenaan */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200] px-3 pt-3">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2">
          <form method="get" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-3xl border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur">
              <div className="flex flex-none rounded-full bg-surface-2 p-0.5">
                <Seg label="DJ's" active={!isClubs} filters={filters} clubs={false} />
                <Seg label="Clubs" active={isClubs} filters={filters} clubs />
              </div>
              {isClubs && <input type="hidden" name="type" value="clubs" />}
              <input
                name="q"
                defaultValue={filters.q}
                placeholder={isClubs ? "Zoek club of stad" : "Zoek DJ of stad"}
                className="min-w-[7rem] flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted sm:text-sm"
              />
              {!isClubs && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`flex-none rounded-full border px-3 py-2 text-sm transition ${
                    filtersOpen ||
                    filters.genre ||
                    filters.budget ||
                    filters.rating ||
                    filters.date ||
                    filters.province ||
                    filters.equipment ||
                    maxKm != null
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted hover:border-brand/50 hover:text-brand"
                  }`}
                >
                  Filters
                </button>
              )}
              <button
                type="submit"
                aria-label="Zoeken"
                className="flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
              >
                Zoek
              </button>
              {!isClubs && (
                <button
                  type="button"
                  onClick={() => setAiOpen((v) => !v)}
                  aria-label="Zoek met AI"
                  title="Zoek met AI"
                  className={`flex-none rounded-full border px-3 py-2 text-sm transition ${
                    aiOpen
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted hover:border-brand/50 hover:text-brand"
                  }`}
                >
                  ✦
                </button>
              )}
            </div>

            {/* Filters: genre + budget (server) + afstand (client, via je locatie) */}
            {!isClubs && filtersOpen && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface/95 p-2 shadow-xl backdrop-blur sm:flex sm:flex-wrap sm:items-center">
                <select
                  name="genre"
                  defaultValue={filters.genre ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Alle genres</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  name="province"
                  defaultValue={filters.province ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Elke provincie</option>
                  {PROVINCES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  name="equipment"
                  defaultValue={filters.equipment ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Apparatuur: maakt niet uit</option>
                  <option value="sound">Brengt geluid mee</option>
                  <option value="light">Brengt licht mee</option>
                </select>
                <select
                  name="budget"
                  defaultValue={filters.budget ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Elk budget</option>
                  <option value="250">tot €250</option>
                  <option value="500">tot €500</option>
                  <option value="750">tot €750</option>
                  <option value="1000">tot €1.000</option>
                  <option value="1500">tot €1.500</option>
                  <option value="2500">tot €2.500</option>
                </select>
                <select
                  value={maxKm ?? ""}
                  onChange={(e) => onDistance(e.target.value)}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Afstand: overal</option>
                  <option value="10">≤ 10 km</option>
                  <option value="25">≤ 25 km</option>
                  <option value="50">≤ 50 km</option>
                  <option value="100">≤ 100 km</option>
                </select>
                <select
                  name="rating"
                  defaultValue={filters.rating ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">Alle reviews</option>
                  <option value="4">★ 4,0+</option>
                  <option value="4.5">★ 4,5+</option>
                  <option value="4.8">★ 4,8+</option>
                </select>
                <input
                  type="date"
                  name="date"
                  defaultValue={filters.date ?? ""}
                  aria-label="Beschikbaar op datum"
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong sm:col-span-1 sm:w-auto"
                >
                  Toepassen
                </button>
                {geoError && (
                  <span className="col-span-2 text-xs text-red-400">
                    {geoError}
                  </span>
                )}
              </div>
            )}
          </form>

          {/* AI-zoeken: subtiel, inklapbaar */}
          {!isClubs && aiOpen && (
            <div className="flex flex-col items-center gap-2">
              {aiOpen && (
                <form
                  action={aiSearch}
                  className="flex w-full items-center gap-1.5 rounded-full border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur"
                >
                  <span className="pl-2 text-brand">✦</span>
                  <input
                    name="prompt"
                    defaultValue={filters.ai}
                    placeholder="Beschrijf wie je zoekt…"
                    className="min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
                  >
                    AI-zoeken
                  </button>
                </form>
              )}
              {aiOpen && filters.ai && chips.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-brand"
                    >
                      {c}
                    </span>
                  ))}
                  <Link href="/discover" className="text-muted hover:text-foreground">
                    wissen
                  </Link>
                </div>
              )}
              {aiOpen && !filters.ai && (
                <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                  {AI_EXAMPLES.map((ex) => (
                    <form key={ex} action={aiSearch}>
                      <input type="hidden" name="prompt" value={ex} />
                      <button
                        type="submit"
                        className="rounded-full border border-border bg-surface/90 px-2.5 py-0.5 text-muted shadow-sm backdrop-blur transition hover:border-brand/50 hover:text-foreground"
                      >
                        {ex}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: zwevend, inklapbaar resultatenpaneel links */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1100] hidden w-[340px] p-3 lg:block ${
          filtersOpen ? "pt-40" : "pt-24"
        }`}
      >
        <div
          className={`pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur ${
            panelOpen ? "h-full" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="font-medium">{countLabel}</span>
            <div className="flex items-center gap-2">
              {!isClubs && panelOpen && (
                <Link
                  href="/shortlist"
                  className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium transition hover:border-brand/50 hover:text-brand"
                >
                  Meerdere
                </Link>
              )}
              <button
                onClick={() => setPanelOpen((v) => !v)}
                aria-label="Lijst in- of uitklappen"
                className="rounded-full px-2 text-muted transition hover:text-foreground"
              >
                {panelOpen ? "▾" : "▸"}
              </button>
            </div>
          </div>
          {panelOpen && (
            <div className="flex-1 overflow-y-auto border-t border-border">
              {results}
            </div>
          )}
        </div>
      </div>

      {/* Mobiel: onderrand-sheet met resultaten */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100] lg:hidden">
        <div className="pointer-events-auto mx-2 mb-2 overflow-hidden rounded-3xl border border-border bg-surface/95 shadow-2xl backdrop-blur">
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className="flex w-full flex-col items-center gap-1.5 px-4 pb-2 pt-2.5"
          >
            <span
              className="h-1 w-10 rounded-full bg-border"
              aria-hidden="true"
            />
            <span className="flex w-full items-center justify-between text-sm">
              <span className="font-medium">{countLabel}</span>
              <span className="text-xs text-muted">
                {sheetOpen ? "verberg ▾" : "toon ▴"}
              </span>
            </span>
          </button>
          {sheetOpen && (
            <div className="max-h-[45vh] overflow-y-auto border-t border-border">
              {results}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Seg({
  label,
  active,
  filters,
  clubs,
}: {
  label: string
  active: boolean
  filters: Filters
  clubs: boolean
}) {
  const params = new URLSearchParams()
  if (clubs) params.set("type", "clubs")
  if (filters.q) params.set("q", filters.q)
  if (filters.city) params.set("city", filters.city)
  const href = params.toString() ? `/discover?${params.toString()}` : "/discover"
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-brand text-black" : "text-muted hover:text-foreground"
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
            <span
              className="flex-none font-semibold text-brand"
              title={
                artist.province_gage != null
                  ? "Totaalbedrag voor deze provincie, incl. reiskosten"
                  : undefined
              }
            >
              {formatEuro(priceFor(artist))}
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
              <span className="text-xs text-muted">cap. {club.capacity}</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
