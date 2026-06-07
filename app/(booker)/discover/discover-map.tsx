"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { formatEuro } from "@/lib/utils/pricing"
import type { Artist } from "@/lib/data/artists"

type Located = Artist & { lat: number; lng: number }

function priceIcon(gage: number, active: boolean) {
  return L.divIcon({
    className: "mg-pin-wrap",
    html: `<div class="mg-pin${active ? " mg-pin--active" : ""}">€${Math.round(gage)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function FitBounds({ artists }: { artists: Located[] }) {
  const map = useMap()
  useEffect(() => {
    if (artists.length === 0) return
    const bounds = L.latLngBounds(artists.map((a) => [a.lat, a.lng]))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
  }, [artists, map])
  return null
}

function Highlight({
  artists,
  activeId,
}: {
  artists: Located[]
  activeId: string | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!activeId) return
    const a = artists.find((x) => x.id === activeId)
    if (a) map.panTo([a.lat, a.lng], { animate: true, duration: 0.5 })
  }, [activeId, artists, map])
  return null
}

export function DiscoverMap({
  artists,
  activeId,
  onActivate,
}: {
  artists: Artist[]
  activeId: string | null
  onActivate: (id: string | null) => void
}) {
  const located = artists.filter(
    (a): a is Located => a.lat != null && a.lng != null,
  )

  return (
    <MapContainer
      center={[52.15, 5.3]}
      zoom={7}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "var(--surface-2)" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
      />
      <FitBounds artists={located} />
      <Highlight artists={located} activeId={activeId} />
      {located.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={priceIcon(a.base_gage, a.id === activeId)}
          eventHandlers={{
            click: () => onActivate(a.id),
          }}
        >
          <Popup>
            <div className="mg-popup">
              <strong>{a.stage_name}</strong>
              {a.genres && <span className="mg-popup__genre">{a.genres.name}</span>}
              <span className="mg-popup__meta">
                {a.home_city ?? "Onbekend"} · {formatEuro(a.base_gage)}
              </span>
              <Link href={`/artists/${a.id}`} className="mg-popup__link">
                Bekijk profiel →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
