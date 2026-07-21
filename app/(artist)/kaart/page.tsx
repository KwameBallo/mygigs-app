import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { cityToCoords } from "@/lib/utils/nl-cities"
import { KaartClient } from "./kaart-client"
import type { BookingPoint } from "./booking-map"

// Kleur per fase (funnel): in afwachting → geaccepteerd → betaald/bevestigd.
const STATUS_COLOR: Record<string, string> = {
  pending: "#3b82f6",
  accepted: "#f59e0b",
  paid: "#22c55e",
  completed: "#22c55e",
}

export default async function KaartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/kaart")

  const { locale, t } = await getI18n()
  const mp = t.map
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const statusLabel = (s: string) =>
    s === "pending"
      ? mp.statusPending
      : s === "accepted"
        ? mp.statusAccepted
        : s === "completed"
          ? mp.statusCompleted
          : mp.statusPaid

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{mp.title}</h1>
        <p className="mt-3 text-muted">{mp.noProfile}</p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          {mp.toProfile}
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
    if (!coords) {
      if (b.city) unlocated.push(b.city)
      continue
    }
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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{mp.title}</h1>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <Legend color="#3b82f6" label={mp.legendPending} />
        <Legend color="#f59e0b" label={mp.legendAccepted} />
        <Legend color="#22c55e" label={mp.legendPaid} />
      </div>

      <div className="mt-4 h-[70vh] overflow-hidden rounded-2xl border border-border">
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted">
            {mp.empty}
          </div>
        ) : (
          <KaartClient points={points} />
        )}
      </div>

      {unlocated.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {mp.noLocation}
          {unlocated.join(", ")}
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
