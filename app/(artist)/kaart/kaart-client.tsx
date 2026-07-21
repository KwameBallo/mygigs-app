"use client"

import dynamic from "next/dynamic"
import type { BookingPoint } from "./booking-map"
import { useT } from "@/components/i18n-provider"

function MapLoading() {
  const { t } = useT()
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-muted">
      {t.map.loading}
    </div>
  )
}

// Leaflet werkt alleen client-side.
const BookingMap = dynamic(
  () => import("./booking-map").then((m) => m.BookingMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
)

export function KaartClient({ points }: { points: BookingPoint[] }) {
  return <BookingMap points={points} />
}
