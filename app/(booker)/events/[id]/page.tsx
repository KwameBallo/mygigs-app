import Link from "next/link"
import { notFound } from "next/navigation"
import { getEvent } from "@/lib/data/events"
import { formatEuro } from "@/lib/utils/pricing"
import { formatEventDate, formatTime } from "@/lib/utils/format"

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const lineup = event.event_artists
    .map((ea) => ea.artists)
    .filter((a): a is NonNullable<typeof a> => !!a)
  const start = formatTime(event.start_time)
  const end = formatTime(event.end_time)
  const city = event.city ?? event.clubs?.city

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Link
        href="/events"
        className="text-sm text-muted transition hover:text-foreground"
      >
        ← Terug naar agenda
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative aspect-[16/9] w-full bg-surface-2">
          {event.flyer_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.flyer_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted">
              Geen flyer
            </div>
          )}
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-black">
                {formatEventDate(event.event_date)}
              </span>
              {start && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
                  {start}
                  {end ? ` – ${end}` : ""}
                </span>
              )}
              {event.genres && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
                  {event.genres.name}
                </span>
              )}
              {event.min_age != null && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
                  {event.min_age}+
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            {event.clubs && (
              <p className="mt-1 text-sm text-muted">
                <Link
                  href={`/clubs/${event.clubs.id}`}
                  className="text-brand hover:underline"
                >
                  {event.clubs.name}
                </Link>
                {city ? ` · ${city}` : ""}
              </p>
            )}

            {event.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {event.description}
              </p>
            )}

            {lineup.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-muted">Line-up</h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {lineup.map((a) => (
                    <Link
                      key={a.id}
                      href={`/artists/${a.id}`}
                      className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pl-1 pr-3 transition hover:border-brand/50"
                    >
                      <span className="h-8 w-8 flex-none overflow-hidden rounded-full bg-surface">
                        {a.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.avatar_url}
                            alt={a.stage_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">
                            {a.stage_name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-medium">
                        {a.stage_name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ticket-aside */}
          <aside className="h-fit rounded-2xl border border-border bg-surface-2 p-5">
            <p className="text-xs text-muted">Toegang</p>
            <p className="mt-1 text-2xl font-semibold">
              {event.ticket_price != null
                ? formatEuro(event.ticket_price)
                : "n.t.b."}
            </p>
            {event.ticket_url ? (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-medium text-black transition hover:bg-brand-strong"
              >
                Tickets
              </a>
            ) : (
              <p className="mt-4 text-xs text-muted">
                Nog geen ticketlink beschikbaar.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
