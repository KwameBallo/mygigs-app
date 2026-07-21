import Link from "next/link"
import { getEvents } from "@/lib/data/events"
import { getI18n } from "@/lib/i18n"
import { AdSlot } from "@/components/ad-slot"
import { EventCard } from "./event-card"
import { dict } from "./i18n"

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
  const { locale } = await getI18n()
  const d = dict[locale]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{d.agenda}</h1>
          <p className="mt-1 text-sm text-muted">
            {d.agendaIntro}
          </p>
        </div>
        <Link
          href="/events/manage"
          className="rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-foreground"
        >
          {d.uploadEvent}
        </Link>
      </div>

      {/* Zoekformulier */}
      <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
        {genre && <input type="hidden" name="genre" value={genre} />}
        <input
          name="q"
          defaultValue={q}
          placeholder={d.searchNamePlaceholder}
          className="input h-10 flex-1 sm:max-w-xs"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder={d.cityPlaceholder}
          className="input h-10 sm:max-w-[10rem]"
        />
        <button
          type="submit"
          className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          {d.search}
        </button>
      </form>

      <AdSlot placement="events_top" className="mt-4" />

      <div className="mt-4 text-sm text-muted">
        {events.length}{" "}
        {events.length === 1 ? d.eventSingular : d.eventPlural}
      </div>

      {events.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium">{d.noEventsFound}</p>
          <Link
            href="/events"
            className="mt-2 inline-block text-sm text-brand"
          >
            {d.clearFilters}
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
