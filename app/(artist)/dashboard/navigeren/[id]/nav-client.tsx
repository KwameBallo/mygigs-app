"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { setBookingEta } from "../../actions"
import { useT } from "@/components/i18n-provider"
import type { LatLng } from "./route-map"

// Leaflet werkt alleen client-side.
const RouteMap = dynamic(() => import("./route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-2" />,
})

function meters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function NavClient({
  bookingId,
  venue,
  address,
}: {
  bookingId: string
  venue: LatLng
  address: string | null
}) {
  const { locale, t } = useT()
  const d = t.dashboard
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const [dj, setDj] = useState<LatLng | null>(null)
  const [route, setRoute] = useState<LatLng[]>([])
  const [durationS, setDurationS] = useState<number | null>(null)
  const [distanceM, setDistanceM] = useState<number | null>(null)
  const [denied, setDenied] = useState(false)

  const lastRouteAt = useRef(0)
  const lastRoutePos = useRef<LatLng | null>(null)
  const lastPersistAt = useRef(0)

  // Route + rijtijd ophalen bij OSRM (gratis). Alleen bij eerste fix, of als de
  // DJ ~120 m verplaatst is, of elke 20 s — om de API niet te overvragen.
  async function refreshRoute(from: LatLng) {
    const now = Date.now()
    const moved = lastRoutePos.current ? meters(from, lastRoutePos.current) : Infinity
    if (now - lastRouteAt.current < 20000 && moved < 120) return
    lastRouteAt.current = now
    lastRoutePos.current = from
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${venue.lng},${venue.lat}?overview=full&geometries=geojson`
      const res = await fetch(url, { headers: { Accept: "application/json" } })
      const json = await res.json()
      const r = json?.routes?.[0]
      if (!r) return
      const coords: LatLng[] = (r.geometry?.coordinates ?? []).map(
        ([lng, lat]: [number, number]) => ({ lat, lng }),
      )
      setRoute(coords)
      setDurationS(r.duration)
      setDistanceM(r.distance)

      // Verwachte aankomsttijd doorzetten naar de boeking (klant ziet 'm), max.
      // eens per 30 s.
      if (typeof r.duration === "number" && now - lastPersistAt.current > 30000) {
        lastPersistAt.current = now
        const eta = new Date(now + r.duration * 1000).toISOString()
        const fd = new FormData()
        fd.set("booking_id", bookingId)
        fd.set("eta", eta)
        void setBookingEta(fd)
      }
    } catch {
      /* stil: kaart blijft staan, ETA wordt later opnieuw geprobeerd */
    }
  }

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true)
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDj(p)
        void refreshRoute(p)
      },
      () => setDenied(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const etaText =
    durationS != null
      ? new Date(Date.now() + durationS * 1000).toLocaleTimeString(dateLocale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null
  const remainingMin = durationS != null ? Math.max(1, Math.round(durationS / 60)) : null
  const distanceKm =
    distanceM != null ? (distanceM / 1000).toFixed(distanceM < 10000 ? 1 : 0) : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link
          href="/dashboard"
          className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
        >
          {d.navBack}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{d.navTitle}</p>
          {address && <p className="truncate text-xs text-muted">{address}</p>}
        </div>
      </div>

      {/* Live reis-info */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-surface-2 px-4 py-2.5 text-sm">
        {denied ? (
          <span className="text-red-400">{d.navDenied}</span>
        ) : etaText ? (
          <>
            <span className="font-semibold text-brand">
              {d.navEta.replace("{eta}", etaText)}
            </span>
            {remainingMin != null && (
              <span className="text-muted">
                {d.navRemaining.replace("{min}", String(remainingMin))}
              </span>
            )}
            {distanceKm != null && (
              <span className="text-muted">
                {d.navDistanceKm.replace("{km}", distanceKm.replace(".", locale === "nl" ? "," : "."))}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted">{d.navLocating}</span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <RouteMap dj={dj} venue={venue} route={route} />
      </div>
    </div>
  )
}
