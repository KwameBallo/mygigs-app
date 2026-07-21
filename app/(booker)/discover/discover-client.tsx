"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { formatFollowers } from "@/lib/utils/format"
import { haversineKm } from "@/lib/utils/geo"
import { PROVINCES, provinceCentroid } from "@/lib/utils/provinces"
import { aiSearch } from "./ai-actions"
import { useT } from "@/components/i18n-provider"
import type { MapPoint } from "./discover-map"
import type { Artist, Genre } from "@/lib/data/artists"
import type { Club } from "@/lib/data/events"

function MapLoading() {
  const { t } = useT()
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-muted">
      {t.discover.mapLoading}
    </div>
  )
}

const DiscoverMap = dynamic(
  () => import("./discover-map").then((m) => m.DiscoverMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
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

// Prijs die de boeker betaalt: provinciebedrag indien gefilterd, anders basis.
function priceFor(a: Artist): number {
  return a.province_gage ?? a.base_gage
}

// Kaartpositie: exacte coördinaten indien bekend, anders het middelpunt van
// de opgegeven provincie — zo verschijnt élke echte DJ op de kaart.
function artistPos(a: Artist): { lat: number; lng: number } | null {
  if (a.lat != null && a.lng != null) return { lat: a.lat, lng: a.lng }
  const c = provinceCentroid(a.province)
  return c ? { lat: c.lat, lng: c.lng } : null
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
  const { t } = useT()
  const d = t.discover
  const EQUIPMENT_LABELS: Record<string, string> = {
    sound: d.equipSoundChip,
    light: d.equipLightChip,
  }
  const AI_EXAMPLES = [d.aiExample1, d.aiExample2, d.aiExample3]
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
        setGeoError(d.geoNotSupported)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeoError(d.geoDenied),
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
      ? d.followersChip.replace(
          "{n}",
          formatFollowers(Number(filters.minFollowers)),
        )
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
          .filter((a) => {
            const p = artistPos(a)
            return p != null && haversineKm(userPos, p) <= maxKm
          })
          .sort((a, b) => {
            const pa = artistPos(a)!
            const pb = artistPos(b)!
            return haversineKm(userPos, pa) - haversineKm(userPos, pb)
          })
      : artists

  const points: MapPoint[] = isClubs
    ? clubs
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({
          id: c.id,
          lat: c.lat as number,
          lng: c.lng as number,
          pin: d.clubBadge,
          title: c.name,
          meta: c.city ?? d.unknownCity,
          href: `/clubs/${c.id}`,
          linkLabel: d.viewClub,
        }))
    : shownArtists
        .map((a) => ({ a, pos: artistPos(a) }))
        .filter(
          (x): x is { a: Artist; pos: { lat: number; lng: number } } =>
            x.pos != null,
        )
        .map(({ a, pos }) => ({
          id: a.id,
          lat: pos.lat,
          lng: pos.lng,
          pin: `€${Math.round(priceFor(a))}`,
          title: a.stage_name,
          genre: a.genres?.name,
          meta: `${a.home_city ?? d.unknownCity} · ${formatEuro(priceFor(a))}`,
          href: `/artists/${a.id}`,
          linkLabel: d.viewProfile,
        }))

  const count = isClubs ? clubs.length : shownArtists.length
  const countLabel = (
    isClubs
      ? count === 1
        ? d.countClub
        : d.countClubs
      : count === 1
        ? d.countDj
        : d.countDjs
  ).replace("{n}", String(count))

  const results =
    count === 0 ? (
      <div className="m-3 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="font-medium">{isClubs ? d.noClubs : d.noDjs}</p>
        <Link
          href={isClubs ? "/discover?type=clubs" : "/discover"}
          className="mt-2 inline-block text-sm text-brand"
        >
          {d.clearFilters}
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
                <Seg label={d.segDjs} active={!isClubs} filters={filters} clubs={false} />
                <Seg label={d.segClubs} active={isClubs} filters={filters} clubs />
              </div>
              {isClubs && <input type="hidden" name="type" value="clubs" />}
              <input
                name="q"
                defaultValue={filters.q}
                placeholder={isClubs ? d.searchClub : d.searchDj}
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
                  {d.filters}
                </button>
              )}
              <button
                type="submit"
                aria-label={d.searchAria}
                className="flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
              >
                {d.search}
              </button>
              {!isClubs && (
                <button
                  type="button"
                  onClick={() => setAiOpen((v) => !v)}
                  aria-label={d.aiToggleAria}
                  title={d.aiToggleAria}
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
                  <option value="">{d.allGenres}</option>
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
                  <option value="">{d.anyProvince}</option>
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
                  <option value="">{d.equipAny}</option>
                  <option value="sound">{d.equipSoundOpt}</option>
                  <option value="light">{d.equipLightOpt}</option>
                </select>
                <select
                  name="budget"
                  defaultValue={filters.budget ?? ""}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">{d.anyBudget}</option>
                  <option value="250">{d.budget250}</option>
                  <option value="500">{d.budget500}</option>
                  <option value="750">{d.budget750}</option>
                  <option value="1000">{d.budget1000}</option>
                  <option value="1500">{d.budget1500}</option>
                  <option value="2500">{d.budget2500}</option>
                </select>
                <select
                  value={maxKm ?? ""}
                  onChange={(e) => onDistance(e.target.value)}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                >
                  <option value="">{d.distanceAny}</option>
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
                  <option value="">{d.allReviews}</option>
                  <option value="4">{d.rating4}</option>
                  <option value="4.5">{d.rating45}</option>
                  <option value="4.8">{d.rating48}</option>
                </select>
                <input
                  type="date"
                  name="date"
                  defaultValue={filters.date ?? ""}
                  aria-label={d.dateAria}
                  className="w-full rounded-full bg-surface-2 px-3 py-2 text-base outline-none sm:w-auto sm:text-sm"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong sm:col-span-1 sm:w-auto"
                >
                  {d.apply}
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
                    placeholder={d.aiPromptPlaceholder}
                    className="min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
                  >
                    {d.aiSearchBtn}
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
                    {d.clear}
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
                  {d.multiple}
                </Link>
              )}
              <button
                onClick={() => setPanelOpen((v) => !v)}
                aria-label={d.listToggleAria}
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
                {sheetOpen ? d.hideList : d.showList}
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
  const { t } = useT()
  const d = t.discover
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
                {d.bookedTimes.replace("{n}", String(artist.total_bookings))}
              </span>
            )}
            {artist.total_bookings === 0 && artist.instagram_followers > 0 && (
              <span className="text-xs text-muted">
                {d.followersCount.replace(
                  "{n}",
                  formatFollowers(artist.instagram_followers),
                )}
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
                artist.province_gage != null ? d.provincePriceTitle : undefined
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
  const { t } = useT()
  return (
    <span
      title={t.discover.verifiedTitle}
      className="inline-flex flex-none items-center text-brand"
      aria-label={t.discover.verifiedAria}
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
  const { t } = useT()
  const d = t.discover
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
              {d.clubBadge}
            </span>
            {club.capacity != null && (
              <span className="text-xs text-muted">
                {d.capacity.replace("{n}", String(club.capacity))}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
