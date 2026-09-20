"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  MapContainer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Basemap } from "@/components/basemap"
import { NlMask } from "@/components/nl-mask"

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

// Pin-labels kunnen DB-tekst bevatten (clubnaam) → escapen voor de innerHTML.
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function pinIcon(label: string, active: boolean) {
  return L.divIcon({
    className: "mg-pin-wrap",
    html: `<div class="mg-pin${active ? " mg-pin--active" : ""}">${escapeHtml(label)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

// Heel Nederland, van Zeeuws-Vlaanderen tot boven de Wadden.
const NL_BOUNDS = L.latLngBounds([50.72, 3.31], [53.56, 7.23])

// Hoe ver je mag wegslepen. Ruim genomen, want deze grens moet je in de buurt
// van Nederland houden en verder niets.
//
// Hij lag eerst strak om het land heen (3.0 tot 7.6 oost). Op een breed scherm
// is het kaartvenster breder dan dat hele gebied, en dan trekt Leaflet het beeld
// terug naar het midden van die grens. Daardoor stond Nederland links in beeld,
// half achter het DJ-paneel, in plaats van er netjes naast.
const ROAM_BOUNDS = L.latLngBounds([48.0, -2.0], [57.0, 13.0])

// Breedte van het resultatenpaneel links (340px plus de marge eromheen) en de
// hoogte van de zwevende zoekbalk bovenin. Die liggen over de kaart heen, dus
// zonder deze correctie centreert Leaflet Nederland achter dat paneel.
const PANEL_W = 364
const SEARCHBAR_H = 96
const PANEL_FROM = 1024 // vanaf lg-breedte staat het paneel in beeld

// Houdt heel Nederland in het zichtbare deel van de kaart.
//
// Het zichtbare deel is niet het hele venster: links ligt de DJ-lijst eroverheen
// en bovenin de zoekbalk. Door die ruimte als marge mee te geven schuift
// Nederland naar rechts en wordt het zo groot mogelijk getoond zonder achter het
// paneel te verdwijnen. Wordt het scherm smaller en verdwijnt het paneel, dan
// centreert hij vanzelf weer in het volle venster.
function FitNetherlands() {
  const map = useMap()

  useEffect(() => {
    const fit = () => {
      // Bij een vertraagd ingeladen kaart kan de container bij het opstarten nog
      // geen afmetingen hebben. Leaflet rekent dan met nul en laat het beeld
      // staan zoals het was. Vandaar eerst de maat opnieuw laten opnemen.
      map.invalidateSize({ animate: false })
      const size = map.getSize()
      if (size.x < 50 || size.y < 50) return

      const wide = size.x >= PANEL_FROM
      map.fitBounds(NL_BOUNDS, {
        paddingTopLeft: [wide ? PANEL_W : 16, SEARCHBAR_H],
        paddingBottomRight: [16, 24],
        animate: false,
      })
    }

    // Meerdere momenten proberen: direct, zodra Leaflet klaar is, en nog een
    // keer als de omliggende schermopbouw is bezonken.
    fit()
    map.whenReady(fit)
    const t1 = setTimeout(fit, 150)
    const t2 = setTimeout(fit, 600)
    window.addEventListener("resize", fit)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener("resize", fit)
    }
  }, [map])

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
      center={[52.15, 5.45]}
      zoom={8}
      zoomSnap={0.25}
      minZoom={7}
      maxZoom={16}
      maxBounds={ROAM_BOUNDS}
      maxBoundsViscosity={0.5}
      scrollWheelZoom
      zoomControl={false}
      preferCanvas
      className="h-full w-full"
      style={{ background: "#e6e6e6" }}
    >
      <Basemap />
      <NlMask />
      <ZoomControl position="bottomright" />
      <FitNetherlands />
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
