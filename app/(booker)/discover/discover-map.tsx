"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type MapPoint = {
  id: string
  lat: number
  lng: number
  pin: string
  title: string
  genre?: string
  meta?: string
  href: string
  linkLabel: string
}

function pinIcon(label: string, active: boolean) {
  return L.divIcon({
    className: "mg-pin-wrap",
    html: `<div class="mg-pin${active ? " mg-pin--active" : ""}">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
  }, [points, map])
  return null
}

function Highlight({
  points,
  activeId,
}: {
  points: MapPoint[]
  activeId: string | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!activeId) return
    const p = points.find((x) => x.id === activeId)
    if (p) map.panTo([p.lat, p.lng], { animate: true, duration: 0.5 })
  }, [activeId, points, map])
  return null
}

export function DiscoverMap({
  points,
  activeId,
  onActivate,
}: {
  points: MapPoint[]
  activeId: string | null
  onActivate: (id: string | null) => void
}) {
  const located = points.filter((p) => p.lat != null && p.lng != null)

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
      <FitBounds points={located} />
      <Highlight points={located} activeId={activeId} />
      {located.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.pin, p.id === activeId)}
          eventHandlers={{ click: () => onActivate(p.id) }}
        >
          <Popup>
            <div className="mg-popup">
              <strong>{p.title}</strong>
              {p.genre && <span className="mg-popup__genre">{p.genre}</span>}
              {p.meta && <span className="mg-popup__meta">{p.meta}</span>}
              <Link href={p.href} className="mg-popup__link">
                {p.linkLabel} →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
