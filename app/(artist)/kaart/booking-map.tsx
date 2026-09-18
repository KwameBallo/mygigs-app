"use client"

import { useEffect } from "react"
import {
  MapContainer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { VectorBasemap } from "@/components/vector-basemap"

export type BookingPoint = {
  id: string
  lat: number
  lng: number
  color: string
  title: string
  meta: string
  statusLabel: string
}

function coloredPin(color: string) {
  return L.divIcon({
    className: "mg-status-pin-wrap",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 2px 5px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  })
}

function FitBounds({ points }: { points: BookingPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
  }, [points, map])
  return null
}

export function BookingMap({ points }: { points: BookingPoint[] }) {
  return (
    <MapContainer
      center={[52.15, 5.45]}
      zoom={8}
      minZoom={7}
      maxZoom={16}
      maxBounds={[
        [50.6, 3.0],
        [53.8, 7.6],
      ]}
      maxBoundsViscosity={0.8}
      scrollWheelZoom
      zoomControl={false}
      preferCanvas
      className="h-full w-full"
      style={{ background: "#e6e6e6" }}
    >
      <VectorBasemap />
      <ZoomControl position="bottomright" />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={coloredPin(p.color)}>
          <Popup>
            <div className="mg-popup">
              <strong>{p.title}</strong>
              <span className="mg-popup__meta">{p.meta}</span>
              <span className="mg-popup__genre">{p.statusLabel}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
