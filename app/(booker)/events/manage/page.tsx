import Link from "next/link"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import {
  getMyClubs,
  getMyEvents,
  getArtistOptions,
} from "@/lib/data/events"
import { getGenres } from "@/lib/data/artists"
import { getI18n } from "@/lib/i18n"
import { formatEuro } from "@/lib/utils/pricing"
import { formatEventDate, formatTime } from "@/lib/utils/format"
import { hasActiveSubscription } from "@/lib/subscriptions"
import { createClub, createEvent, deleteEvent } from "./actions"
import { dict } from "../i18n"

export default async function ManageEventsPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/events/manage")

  const { locale } = await getI18n()
  const d = dict[locale]

  const subActive = hasActiveSubscription(profile.subscription_status)

  const [clubs, events, artists, genres] = await Promise.all([
    getMyClubs(profile.id),
    getMyEvents(profile.id),
    getArtistOptions(),
    getGenres(),
  ])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {d.myEventsAndVenues}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {d.manageIntro}
      </p>

      {!subActive && (
        <div className="mt-5 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <p className="text-sm font-medium text-brand">
            {d.subRequired}
          </p>
          <p className="mt-1 text-sm text-muted">
            {d.subRequiredBody}
          </p>
          <Link
            href="/subscribe"
            className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            {d.viewSubscriptions}
          </Link>
        </div>
      )}

      {/* ---- Locaties ---- */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted">{d.myVenues}</h2>
        {clubs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {d.noVenuesYet}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {clubs.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="font-medium">{c.name}</span>
                  {c.city && (
                    <span className="text-sm text-muted"> · {c.city}</span>
                  )}
                </span>
                <Link
                  href={`/clubs/${c.id}`}
                  className="text-sm text-brand hover:underline"
                >
                  {d.view}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">
            {d.newVenue}
          </summary>
          <form action={createClub} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={d.labelName} className="sm:col-span-2">
              <input name="name" required className="input h-10 w-full" />
            </Field>
            <Field label={d.labelCity}>
              <input name="city" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelAddress}>
              <input name="address" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelCapacity}>
              <input
                name="capacity"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label={d.labelWebsite}>
              <input name="website_url" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelEmail}>
              <input name="contact_email" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelPhone}>
              <input name="contact_phone" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelImageUrl} className="sm:col-span-2">
              <input name="image_url" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelDescription} className="sm:col-span-2">
              <textarea
                name="description"
                rows={3}
                className="input w-full py-2"
              />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
              >
                {d.saveVenue}
              </button>
            </div>
          </form>
        </details>
      </section>

      {/* ---- Nieuw event ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">{d.newEvent}</h2>
        {clubs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {d.createVenueFirst}
          </p>
        ) : (
          <form
            action={createEvent}
            className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
          >
            <Field label={d.labelVenue} className="sm:col-span-2">
              <select name="club_id" required className="input h-10 w-full">
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` (${c.city})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={d.labelTitle} className="sm:col-span-2">
              <input name="title" required className="input h-10 w-full" />
            </Field>
            <Field label={d.labelDate}>
              <input
                name="event_date"
                type="date"
                required
                className="input h-10 w-full"
              />
            </Field>
            <Field label={d.labelGenre}>
              <select name="genre_id" className="input h-10 w-full">
                <option value="">—</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={d.labelStart}>
              <input name="start_time" type="time" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelEnd}>
              <input name="end_time" type="time" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelCity}>
              <input name="city" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelMinAge}>
              <input
                name="min_age"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label={d.labelTicketPrice}>
              <input
                name="ticket_price"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label={d.labelTicketUrl}>
              <input name="ticket_url" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelFlyerUrl} className="sm:col-span-2">
              <input name="flyer_url" className="input h-10 w-full" />
            </Field>
            <Field label={d.labelDescription} className="sm:col-span-2">
              <textarea
                name="description"
                rows={3}
                className="input w-full py-2"
              />
            </Field>
            <Field
              label={d.labelLineup}
              className="sm:col-span-2"
            >
              {artists.length === 0 ? (
                <p className="text-sm text-muted">
                  {d.noDjsAvailable}
                </p>
              ) : (
                <select
                  name="artist_ids"
                  multiple
                  size={Math.min(artists.length, 6)}
                  className="input w-full py-2"
                >
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.stage_name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
              >
                {d.publishEvent}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ---- Mijn events ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">{d.myEvents}</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{d.noEventsUploaded}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((e) => {
              const time = formatTime(e.start_time)
              const lineup = e.event_artists
                .map((ea) => ea.artists?.stage_name)
                .filter(Boolean)
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${e.id}`}
                      className="font-medium hover:underline"
                    >
                      {e.title}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {formatEventDate(e.event_date, locale)}
                      {time ? ` · ${time}` : ""}
                      {e.clubs?.name ? ` · ${e.clubs.name}` : ""}
                      {e.ticket_price != null
                        ? ` · ${formatEuro(e.ticket_price)}`
                        : ""}
                      {lineup.length > 0 ? ` · ${lineup.join(", ")}` : ""}
                    </p>
                  </div>
                  <form action={deleteEvent}>
                    <input type="hidden" name="event_id" value={e.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-500/50 hover:text-red-400"
                    >
                      {d.delete}
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}
