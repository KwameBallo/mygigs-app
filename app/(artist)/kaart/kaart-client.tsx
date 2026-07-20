"use client"

import dynamic from "next/dynamic"
import type { BookingPoint } from "./booking-map"

// Leaflet werkt alleen client-side.
const BookingMap = dynamic(
  () => import("./booking-map").then((m) => m.BookingMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-muted">
        Kaart laden…
      </div>
    ),
  },
)

export function KaartClient({ points }: { points: BookingPoint[] }) {
  return <BookingMap points={points} />
}
