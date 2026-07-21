import Link from "next/link"
import { notFound } from "next/navigation"
import { getClub, getClubEvents } from "@/lib/data/events"
import { getI18n } from "@/lib/i18n"
import { EventCard } from "../../events/event-card"
import { dict } from "./i18n"

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ locale }, [club, events]] = await Promise.all([
    getI18n(),
    Promise.all([getClub(id), getClubEvents(id)]),
  ])
  if (!club) notFound()
  const d = dict[locale]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link
        href="/events"
        className="text-sm text-muted transition hover:text-foreground"
      >
        {d.backToAgenda}
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="relative aspect-[16/6] w-full bg-surface-2">
          {club.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.image_url}
              alt={club.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{club.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[club.address, club.city].filter(Boolean).join(", ") ||
              d.locationUnknown}
            {club.capacity
              ? d.capacity.replace("{n}", String(club.capacity))
              : ""}
          </p>
          {club.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {club.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {club.website_url && (
              <a
                href={club.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                {d.website}
              </a>
            )}
            {club.contact_email && (
              <a
                href={`mailto:${club.contact_email}`}
                className="text-brand hover:underline"
              >
                {d.email}
              </a>
            )}
            {club.contact_phone && (
              <a
                href={`tel:${club.contact_phone}`}
                className="text-brand hover:underline"
              >
                {club.contact_phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">{d.upcomingEvents}</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{d.noUpcomingEvents}</p>
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
