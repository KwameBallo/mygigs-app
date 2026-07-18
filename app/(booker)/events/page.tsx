import Link from "next/link"
import { getEvents } from "@/lib/data/events"
import { AdSlot } from "@/components/ad-slot"
import { EventCard } from "./event-card"

type SearchParams = Promise<{
  q?: string
  city?: string
  genre?: string
}>

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, city, genre } = await searchParams
  const events = await getEvents({ q, city, genre })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted">
            Aankomende events bij clubs en locaties, met de line-up erbij.
          </p>
        </div>
        <Link
          href="/events/manage"
          className="rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-foreground"
        >
          Event uploaden
        </Link>
      </div>

      {/* Zoekformulier */}
      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        {genre && <input type="hidden" name="genre" value={genre} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op naam..."
          className="input h-10 flex-1 sm:max-w-xs"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder="Stad"
          className="input h-10 sm:max-w-[10rem]"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          Zoek
        </button>
      </form>

      <AdSlot placement="events_top" className="mt-4" />

      <div className="mt-4 text-sm text-muted">
        {events.length} {events.length === 1 ? "event" : "events"}
      </div>

      {events.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium">Geen events gevonden</p>
          <Link
            href="/events"
            className="mt-2 inline-block text-sm text-brand"
          >
            Wis filters
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
