import { cityToCoords } from "@/lib/utils/nl-cities"
import { KaartClient } from "../kaart/kaart-client"
import type { BookingPoint } from "../kaart/booking-map"
import { GigMonths } from "./gigs-months"

// Kleur per fase: in afwachting → geaccepteerd → betaald/afgerond.
const STATUS_COLOR: Record<string, string> = {
  pending: "#3b82f6",
  accepted: "#f59e0b",
  paid: "#22c55e",
  completed: "#22c55e",
}

type MapBooking = {
  id: string
  city: string | null
  venue_name: string | null
  event_date: string
  status: string
  lat: number | null
  lng: number | null
}

type Labels = {
  title: string
  intro: string
  countMany: string
  countOne: string
  legendPending: string
  legendAccepted: string
  legendPaid: string
  empty: string
  statusPending: string
  statusAccepted: string
  statusPaid: string
  statusCompleted: string
}

// Kaart met de eigen boekingen, onderaan "Mijn boekingen". Gebruikt het exacte
// event-adres (coördinaten) waar beschikbaar, anders de stad.
export function BookingsMapSection({
  bookings,
  dateLocale,
  labels,
}: {
  bookings: MapBooking[]
  dateLocale: string
  labels: Labels
}) {
  const statusLabel = (s: string) =>
    s === "pending"
      ? labels.statusPending
      : s === "accepted"
        ? labels.statusAccepted
        : s === "completed"
          ? labels.statusCompleted
          : labels.statusPaid

  const points: BookingPoint[] = []
  for (const b of bookings) {
    const coords: [number, number] | null =
      b.lat != null && b.lng != null
        ? [Number(b.lat), Number(b.lng)]
        : cityToCoords(b.city)
    if (!coords) continue
    points.push({
      id: b.id,
      lat: coords[0],
      lng: coords[1],
      color: STATUS_COLOR[b.status] ?? "#9ca3af",
      title: b.venue_name ?? b.city ?? "—",
      meta: `${new Date(b.event_date).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}${b.city ? ` · ${b.city}` : ""}`,
      statusLabel: statusLabel(b.status),
    })
  }

  const gigs = bookings
    .filter((b) => b.event_date)
    .map((b) => ({
      id: b.id,
      place: b.venue_name ?? b.city ?? "—",
      city: b.city,
      date: b.event_date,
      status: b.status,
    }))

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">{labels.title}</h2>
      <p className="mt-1 text-xs text-muted">{labels.intro}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <Legend color="#3b82f6" label={labels.legendPending} />
        <Legend color="#f59e0b" label={labels.legendAccepted} />
        <Legend color="#22c55e" label={labels.legendPaid} />
      </div>
      <div className="mt-3 h-[55vh] overflow-hidden rounded-2xl border border-border">
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted">
            {labels.empty}
          </div>
        ) : (
          <KaartClient points={points} />
        )}
      </div>
      <GigMonths
        gigs={gigs}
        dateLocale={dateLocale}
        labels={{
          countMany: labels.countMany,
          countOne: labels.countOne,
          statusPending: labels.statusPending,
          statusAccepted: labels.statusAccepted,
          statusPaid: labels.statusPaid,
          statusCompleted: labels.statusCompleted,
        }}
      />
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
