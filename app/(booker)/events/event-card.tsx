import Link from "next/link"
import { formatEuro } from "@/lib/utils/pricing"
import { formatEventDate, formatTime } from "@/lib/utils/format"
import type { EventListItem } from "@/lib/data/events"

export function EventCard({ event }: { event: EventListItem }) {
  const lineup = event.event_artists
    .map((ea) => ea.artists?.stage_name)
    .filter((n): n is string => !!n)
  const time = formatTime(event.start_time)
  const city = event.city ?? event.clubs?.city

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/40"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-surface-2">
        {event.flyer_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.flyer_url}
            alt={event.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">
            Geen flyer
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {formatEventDate(event.event_date)}
          {time ? ` · ${time}` : ""}
        </span>
        {event.genres && (
          <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-black">
            {event.genres.name}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="truncate font-semibold">{event.title}</h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {event.clubs?.name ?? "Locatie onbekend"}
          {city ? ` · ${city}` : ""}
        </p>

        {lineup.length > 0 && (
          <p className="mt-2 line-clamp-2 text-xs text-muted">
            <span className="text-foreground">Line-up:</span>{" "}
            {lineup.join(", ")}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          {event.ticket_price != null ? (
            <span className="font-semibold text-brand">
              {formatEuro(event.ticket_price)}
            </span>
          ) : (
            <span className="text-xs text-muted">Prijs n.t.b.</span>
          )}
          {event.min_age != null && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {event.min_age}+
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
