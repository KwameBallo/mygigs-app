"use client"

import { useEffect } from "react"
import Link from "next/link"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { formatEuro } from "@/lib/utils/pricing"
import { categoryLabel } from "@/lib/data/suppliers-meta"
import type { Supplier } from "@/lib/data/suppliers"

type Located = Supplier & { lat: number; lng: number }

function pinIcon(supplier: Located, active: boolean) {
  const label =
    supplier.day_rate != null
      ? `€${Math.round(supplier.day_rate)}`
      : categoryLabel(supplier.category)
  return L.divIcon({
    className: "mg-pin-wrap",
    html: `<div class="mg-pin${active ? " mg-pin--active" : ""}">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function FitBounds({ suppliers }: { suppliers: Located[] }) {
  const map = useMap()
  useEffect(() => {
    if (suppliers.length === 0) return
    const bounds = L.latLngBounds(suppliers.map((s) => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
  }, [suppliers, map])
  return null
}

function Highlight({
  suppliers,
  activeId,
}: {
  suppliers: Located[]
  activeId: string | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!activeId) return
    const s = suppliers.find((x) => x.id === activeId)
    if (s) map.panTo([s.lat, s.lng], { animate: true, duration: 0.5 })
  }, [activeId, suppliers, map])
  return null
}

export function SuppliersMap({
  suppliers,
  activeId,
  onActivate,
}: {
  suppliers: Supplier[]
  activeId: string | null
  onActivate: (id: string | null) => void
}) {
  const located = suppliers.filter(
    (s): s is Located => s.lat != null && s.lng != null,
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
      <FitBounds suppliers={located} />
      <Highlight suppliers={located} activeId={activeId} />
      {located.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={pinIcon(s, s.id === activeId)}
          eventHandlers={{ click: () => onActivate(s.id) }}
        >
          <Popup>
            <div className="mg-popup">
              <strong>{s.name}</strong>
              <span className="mg-popup__genre">
                {categoryLabel(s.category)}
              </span>
              <span className="mg-popup__meta">
                {s.city ?? "Onbekend"}
                {s.day_rate != null ? ` · ${formatEuro(s.day_rate)}/dag` : ""}
              </span>
              <Link href={`/suppliers/${s.id}`} className="mg-popup__link">
                Bekijk leverancier →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
