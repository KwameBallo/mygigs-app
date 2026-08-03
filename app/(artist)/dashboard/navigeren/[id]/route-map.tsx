"use client"

import { useEffect } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  ZoomControl,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type LatLng = { lat: number; lng: number }

function venueIcon() {
  return L.divIcon({
    className: "mg-nav-venue",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#ff6a00;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 18],
  })
}

function djIcon() {
  return L.divIcon({
    className: "mg-nav-dj",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.35),0 2px 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// Past de kaart aan op de route (of op de twee punten als er nog geen route is).
function Fit({ dj, venue, route }: { dj: LatLng | null; venue: LatLng; route: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    const pts: [number, number][] =
      route.length > 1
        ? route.map((p) => [p.lat, p.lng])
        : dj
          ? [
              [dj.lat, dj.lng],
              [venue.lat, venue.lng],
            ]
          : [[venue.lat, venue.lng]]
    if (pts.length === 1) {
      map.setView(pts[0], 14)
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 })
    }
  }, [dj, venue, route, map])
  return null
}

export function RouteMap({
  dj,
  venue,
  route,
}: {
  dj: LatLng | null
  venue: LatLng
  route: LatLng[]
}) {
  return (
    <MapContainer
      center={[venue.lat, venue.lng]}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      preferCanvas
      className="h-full w-full"
      style={{ background: "#e6e6e6" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        keepBuffer={4}
        updateWhenZooming={false}
      />
      <ZoomControl position="bottomright" />
      {route.length > 1 && (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#ff6a00", weight: 5, opacity: 0.9 }}
        />
      )}
      <Marker position={[venue.lat, venue.lng]} icon={venueIcon()} />
      {dj && <Marker position={[dj.lat, dj.lng]} icon={djIcon()} />}
      <Fit dj={dj} venue={venue} route={route} />
    </MapContainer>
  )
}
