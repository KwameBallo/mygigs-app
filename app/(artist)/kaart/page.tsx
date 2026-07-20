import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { cityToCoords } from "@/lib/utils/nl-cities"
import { KaartClient } from "./kaart-client"
import type { BookingPoint } from "./booking-map"

// Kleur per fase (funnel): in afwachting → geaccepteerd → betaald/bevestigd.
const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  pending: { color: "#3b82f6", label: "In afwachting" },
  accepted: { color: "#f59e0b", label: "Geaccepteerd — wacht op betaling" },
  paid: { color: "#22c55e", label: "Betaald & bevestigd" },
  completed: { color: "#22c55e", label: "Afgerond" },
}

export default async function KaartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/kaart")

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Boekingen op de kaart
        </h1>
        <p className="mt-3 text-muted">
          Je hebt nog geen DJ-profiel. Maak er eerst een aan.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          Naar profiel
        </Link>
      </main>
    )
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, city, venue_name, event_date, status")
    .eq("artist_id", artist.id)
    .in("status", ["pending", "accepted", "paid", "completed"])
    .order("event_date", { ascending: true })

  const list = bookings ?? []
  const points: BookingPoint[] = []
  const unlocated: string[] = []

  for (const b of list) {
    const coords = cityToCoords(b.city)
    const style = STATUS_STYLE[b.status] ?? { color: "#9ca3af", label: b.status }
    if (!coords) {
      if (b.city) unlocated.push(b.city)
      continue
    }
    points.push({
      id: b.id,
      lat: coords[0],
      lng: coords[1],
      color: style.color,
      title: b.venue_name ?? b.city ?? "Boeking",
      meta: `${new Date(b.event_date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}${b.city ? ` · ${b.city}` : ""}`,
      statusLabel: style.label,
    })
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Boekingen op de kaart
      </h1>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <Legend color="#3b82f6" label="In afwachting" />
        <Legend color="#f59e0b" label="Geaccepteerd (wacht op betaling)" />
        <Legend color="#22c55e" label="Betaald & bevestigd" />
      </div>

      <div className="mt-4 h-[70vh] overflow-hidden rounded-2xl border border-border">
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted">
            Nog geen boekingen om op de kaart te tonen.
          </div>
        ) : (
          <KaartClient points={points} />
        )}
      </div>

      {unlocated.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Zonder kaartlocatie (onbekende stad): {unlocated.join(", ")}
        </p>
      )}
    </main>
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
