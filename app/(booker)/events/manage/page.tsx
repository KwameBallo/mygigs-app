import Link from "next/link"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import {
  getMyClubs,
  getMyEvents,
  getArtistOptions,
} from "@/lib/data/events"
import { getGenres } from "@/lib/data/artists"
import { formatEuro } from "@/lib/utils/pricing"
import { formatEventDate, formatTime } from "@/lib/utils/format"
import { hasActiveSubscription } from "@/lib/subscriptions"
import { createClub, createEvent, deleteEvent } from "./actions"

export default async function ManageEventsPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/events/manage")

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
        Mijn events &amp; locaties
      </h1>
      <p className="mt-1 text-sm text-muted">
        Maak een locatie aan en upload je eigen events met line-up.
      </p>

      {!subActive && (
        <div className="mt-5 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <p className="text-sm font-medium text-brand">
            Abonnement vereist
          </p>
          <p className="mt-1 text-sm text-muted">
            Om locaties en events te plaatsen heb je een organisatoren-abonnement
            nodig. Start met een gratis proefperiode.
          </p>
          <Link
            href="/subscribe"
            className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            Bekijk abonnementen
          </Link>
        </div>
      )}

      {/* ---- Locaties ---- */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted">Mijn locaties</h2>
        {clubs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Je hebt nog geen locatie. Maak er hieronder een aan.
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
                  Bekijk
                </Link>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3 rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">
            + Nieuwe locatie
          </summary>
          <form action={createClub} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Naam *" className="sm:col-span-2">
              <input name="name" required className="input h-10 w-full" />
            </Field>
            <Field label="Stad">
              <input name="city" className="input h-10 w-full" />
            </Field>
            <Field label="Adres">
              <input name="address" className="input h-10 w-full" />
            </Field>
            <Field label="Capaciteit">
              <input
                name="capacity"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label="Website">
              <input name="website_url" className="input h-10 w-full" />
            </Field>
            <Field label="E-mail">
              <input name="contact_email" className="input h-10 w-full" />
            </Field>
            <Field label="Telefoon">
              <input name="contact_phone" className="input h-10 w-full" />
            </Field>
            <Field label="Afbeelding-URL" className="sm:col-span-2">
              <input name="image_url" className="input h-10 w-full" />
            </Field>
            <Field label="Beschrijving" className="sm:col-span-2">
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
                Locatie opslaan
              </button>
            </div>
          </form>
        </details>
      </section>

      {/* ---- Nieuw event ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">Nieuw event</h2>
        {clubs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Maak eerst een locatie aan voordat je een event uploadt.
          </p>
        ) : (
          <form
            action={createEvent}
            className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
          >
            <Field label="Locatie *" className="sm:col-span-2">
              <select name="club_id" required className="input h-10 w-full">
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` (${c.city})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titel *" className="sm:col-span-2">
              <input name="title" required className="input h-10 w-full" />
            </Field>
            <Field label="Datum *">
              <input
                name="event_date"
                type="date"
                required
                className="input h-10 w-full"
              />
            </Field>
            <Field label="Genre">
              <select name="genre_id" className="input h-10 w-full">
                <option value="">—</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Aanvang">
              <input name="start_time" type="time" className="input h-10 w-full" />
            </Field>
            <Field label="Einde">
              <input name="end_time" type="time" className="input h-10 w-full" />
            </Field>
            <Field label="Stad">
              <input name="city" className="input h-10 w-full" />
            </Field>
            <Field label="Min. leeftijd">
              <input
                name="min_age"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label="Ticketprijs (€)">
              <input
                name="ticket_price"
                type="number"
                min="0"
                className="input h-10 w-full"
              />
            </Field>
            <Field label="Ticket-URL">
              <input name="ticket_url" className="input h-10 w-full" />
            </Field>
            <Field label="Flyer-URL" className="sm:col-span-2">
              <input name="flyer_url" className="input h-10 w-full" />
            </Field>
            <Field label="Beschrijving" className="sm:col-span-2">
              <textarea
                name="description"
                rows={3}
                className="input w-full py-2"
              />
            </Field>
            <Field
              label="Line-up (meerdere selecteren met Cmd/Ctrl)"
              className="sm:col-span-2"
            >
              {artists.length === 0 ? (
                <p className="text-sm text-muted">
                  Nog geen DJ&apos;s beschikbaar.
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
                Event publiceren
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ---- Mijn events ---- */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">Mijn events</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nog geen events geüpload.</p>
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
                      {formatEventDate(e.event_date)}
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
                      Verwijder
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
