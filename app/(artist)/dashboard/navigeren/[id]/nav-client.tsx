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

  const [started, setStarted] = useState(false)
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

  // Vraag de locatie direct vanuit de tik aan (sommige mobiele browsers eisen
  // dat de aanvraag uit een gebruikersgebaar komt, anders weigeren ze meteen).
  function requestAndStart() {
    setDenied(false)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true)
      setStarted(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDj(p)
        void refreshRoute(p)
        setStarted(true)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setDenied(true)
        // Timeout/onbeschikbaar: toch starten; de watch probeert het opnieuw.
        setStarted(true)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )
  }

  useEffect(() => {
    // De doorlopende watch start pas ná de eerste toestemming/tik.
    if (!started) return
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true)
      return
    }
    let watchId = 0
    let highAccuracy = true
    const startWatch = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDenied(false)
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setDj(p)
          void refreshRoute(p)
        },
        (err) => {
          // Alleen bij écht geweigerde toestemming stoppen.
          if (err.code === err.PERMISSION_DENIED) {
            setDenied(true)
            return
          }
          // Timeout/onbeschikbaar (vaak binnenshuis): val één keer terug op
          // netwerk-locatie i.p.v. hoge-nauwkeurigheid GPS.
          if (highAccuracy) {
            highAccuracy = false
            navigator.geolocation.clearWatch(watchId)
            startWatch()
          }
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 10000, timeout: 30000 },
      )
    }
    startWatch()
    return () => navigator.geolocation.clearWatch(watchId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

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

      {started ? (
        <>
          {/* Live reis-info */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-surface-2 px-4 py-2.5 text-sm">
            {denied ? (
              <span className="flex items-center gap-3">
                <span className="text-red-400">{d.navDenied}</span>
                <button
                  type="button"
                  onClick={requestAndStart}
                  className="rounded-full border border-brand/50 px-3 py-1 text-xs font-medium text-brand transition hover:bg-brand/10"
                >
                  {d.navRetry}
                </button>
              </span>
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
                    {d.navDistanceKm.replace(
                      "{km}",
                      distanceKm.replace(".", locale === "nl" ? "," : "."),
                    )}
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
        </>
      ) : (
        // Toestemming-gate: locatie wordt pas gebruikt na een expliciete keuze.
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              {d.navConsentTitle}
            </h2>
            <p className="mt-2 text-sm text-muted">{d.navConsentBody}</p>
            <button
              type="button"
              onClick={requestAndStart}
              className="mt-5 w-full rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
            >
              {d.navConsentStart}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
