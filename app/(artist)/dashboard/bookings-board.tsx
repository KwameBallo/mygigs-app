"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import type { Database } from "@/types/database"
import {
  updateBookingStatus,
  toggleBookingPublic,
  checkInBooking,
  startEnroute,
} from "./actions"
import { openBookingChat } from "@/lib/actions/chat"
import { useT } from "@/components/i18n-provider"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

type BookingKind = Database["public"]["Enums"]["booking_type"]

export type DashBooking = {
  id: string
  status: BookingStatus
  event_date: string
  city: string | null
  venue_name: string | null
  address: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  message: string | null
  gage: number
  service_fee: number
  total: number
  hours: number
  booking_type: BookingKind
  occasion: string | null
  company_name: string | null
  start_time: string | null
  end_time: string | null
  booker_name: string | null
  is_public: boolean
  created_at: string
  enroute_at: string | null
  eta: string | null
  checkin_at: string | null
  checkin_distance_m: number | null
  checkin_accuracy_m: number | null
  checkin_verified: boolean
  booker_confirmed_at: string | null
}

const PUBLIC_STATUSES = ["accepted", "paid", "completed"]
const CONFIRMED = ["accepted", "paid"]
const DONE = ["completed", "declined", "cancelled"]

// Hoeveel dagen geleden de aanvraag binnenkwam, voor urgentie-weergave.
function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function urgencyLabel(
  iso: string,
  labels: { new: string; one: string; days: string },
) {
  const d = daysAgo(iso)
  if (d <= 0) return { text: labels.new, urgent: false }
  if (d === 1) return { text: labels.one, urgent: false }
  return { text: labels.days.replace("{d}", String(d)), urgent: d >= 3 }
}

// "20:00:00" → "20:00". Geeft null terug voor lege/ongeldige tijden.
function formatTime(t: string | null) {
  if (!t) return null
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? `${m[1]}:${m[2]}` : null
}

// Tijdvenster van het event, bijv. "20:00 – 01:00" of alleen de starttijd.
function timeRange(start: string | null, end: string | null) {
  const s = formatTime(start)
  const e = formatTime(end)
  if (s && e) return `${s} – ${e}`
  return s ?? e
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string
  count: number
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <h2
        className={`text-xs font-semibold uppercase tracking-wider ${
          accent ? "text-brand" : "text-muted"
        }`}
      >
        {title}
      </h2>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          accent ? "bg-brand/15 text-brand" : "bg-surface-2 text-muted"
        }`}
      >
        {count}
      </span>
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
      {text}
    </p>
  )
}

export function BookingsBoard({ bookings }: { bookings: DashBooking[] }) {
  const { t } = useT()
  const d = t.dashboard
  // Aanvragen bovenaan (oudste eerst = meest urgent), dan aankomende gigs op
  // datum, en als laatst de afgeronde (ingeklapt).
  const pending = bookings
    .filter((b) => b.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  const upcoming = bookings
    .filter((b) => CONFIRMED.includes(b.status))
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
    )
  const done = bookings.filter((b) => DONE.includes(b.status))
  const [showDone, setShowDone] = useState(false)

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Aanvragen — belangrijkst, altijd bovenaan */}
      <section>
        <SectionHeader
          title={d.secRequests}
          count={pending.length}
          accent={pending.length > 0}
        />
        {pending.length === 0 ? (
          <EmptyLine text={d.emptyOpen} />
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {/* Open — bevestigde, aankomende optredens */}
      <section>
        <SectionHeader title={d.secUpcoming} count={upcoming.length} />
        {upcoming.length === 0 ? (
          <EmptyLine text={d.emptyConfirmed} />
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {/* Afgerond — inklapbaar, minst belangrijk */}
      <section>
        <button
          type="button"
          onClick={() => setShowDone((s) => !s)}
          aria-expanded={showDone}
          className="flex w-full items-center gap-2"
        >
          <SectionHeader title={d.secDone} count={done.length} />
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 text-muted transition-transform ${
              showDone ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M2.5 4.5 L6 8 L9.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showDone &&
          (done.length === 0 ? (
            <EmptyLine text={d.emptyDone} />
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {done.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          ))}
      </section>
    </div>
  )
}

// Chat-knop met de klant (na acceptatie).
function ChatButton({ id, label }: { id: string; label: string }) {
  return (
    <form action={openBookingChat}>
      <input type="hidden" name="booking_id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
      >
        {label}
      </button>
    </form>
  )
}

function BookingCard({ booking: b }: { booking: DashBooking }) {
  const { locale, t } = useT()
  const d = t.dashboard
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const isPending = b.status === "pending"
  // AVG/dataminimalisatie: de naam van de klant komt pas vrij zodra er een
  // grondslag is — d.w.z. de aanvraag is geaccepteerd. Daarvóór blijft de
  // klant anoniem voor de DJ.
  const contactUnlocked = ["accepted", "paid", "completed"].includes(b.status)
  const u = isPending
    ? urgencyLabel(b.created_at, {
        new: d.urgencyNew,
        one: d.urgency1,
        days: d.urgencyDays,
      })
    : null
  const [open, setOpen] = useState(false)
  const eventDate = new Date(b.event_date).toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const typeLabel = b.booking_type === "zakelijk" ? d.business : d.private
  const durationVal = `${String(b.hours).replace(
    ".",
    locale === "nl" ? "," : ".",
  )} ${d.hoursUnit}`

  const dayNum = new Date(b.event_date).getDate()
  const monthShort = new Date(b.event_date).toLocaleDateString(dateLocale, {
    month: "short",
  })
  const time = timeRange(b.start_time, b.end_time)
  const place = [b.city, b.venue_name].filter(Boolean).join(" · ")

  const stripe = isPending
    ? "var(--brand)"
    : b.status === "accepted"
      ? "#f59e0b"
      : ["paid", "completed"].includes(b.status)
        ? "#22c55e"
        : "var(--border)"

  const chevron = (
    <svg
      viewBox="0 0 12 12"
      className={`h-3.5 w-3.5 text-muted transition-transform ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 L6 8 L9.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  // Gedeeld detailpaneel (gegevens, bericht, uitbetaling, navigatie/bewijs).
  const details = (
    <div className="mt-3 border-t border-border pt-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailRow label={d.rowType} value={typeLabel} />
        <DetailRow label={d.rowOccasion} value={b.occasion} />
        <DetailRow label={d.rowDate} value={eventDate} />
        <DetailRow label={d.rowDuration} value={durationVal} />
        <DetailRow label={d.rowTime} value={timeRange(b.start_time, b.end_time)} />
        <DetailRow label={d.rowCity} value={b.city} />
        <DetailRow label={d.rowVenue} value={b.venue_name} />
        <DetailRow label={d.rowAddress} value={b.address} />
        {contactUnlocked ? (
          <DetailRow
            label={b.booking_type === "zakelijk" ? d.rowCompany : d.rowClient}
            value={b.company_name ?? b.booker_name}
          />
        ) : (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              {d.rowClient}
            </dt>
            <dd className="mt-0.5 text-sm text-muted">{d.nameAfterAccept}</dd>
          </div>
        )}
      </dl>

      {b.message && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {d.clientMessage}
          </p>
          <p className="mt-1 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            “{b.message}”
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm">
        <div className="flex items-center justify-between py-0.5">
          <span className="font-medium">{d.yourGage}</span>
          <span className="font-semibold text-brand">{formatEuro(b.gage)}</span>
        </div>
        <div className="flex items-center justify-between py-0.5 text-muted">
          <span>{d.clientPays}</span>
          <span>{formatEuro(b.total)}</span>
        </div>
      </div>

      {contactUnlocked && <LocationProof b={b} />}

      {PUBLIC_STATUSES.includes(b.status) && (
        <form action={toggleBookingPublic} className="mt-4">
          <input type="hidden" name="booking_id" value={b.id} />
          <input type="hidden" name="is_public" value={String(!b.is_public)} />
          <button
            type="submit"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              b.is_public
                ? "border-brand/50 bg-brand/10 text-brand"
                : "border-border text-muted hover:border-brand/50"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                b.is_public ? "bg-brand" : "bg-muted"
              }`}
            />
            {b.is_public ? d.visibleFans : d.showPublic}
          </button>
        </form>
      )}

      {isPending && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5 flex-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
          </svg>
          {d.avgHint}
        </p>
      )}
    </div>
  )

  // Aanvraag = spotlight: oranje omrande kaart met acties direct zichtbaar.
  if (isPending) {
    return (
      <div className="rounded-2xl border border-brand/60 bg-brand/5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-brand">
            {d.secRequests}
            {u ? ` · ${u.text}` : ""}
          </span>
          <span className="font-semibold text-brand">{formatEuro(b.gage)}</span>
        </div>
        <p className="mt-2 text-2xl font-semibold leading-none">
          {dayNum}
          <span className="ml-1.5 text-sm font-normal text-muted">
            {monthShort}
            {time ? ` · ${time}` : ""}
          </span>
        </p>
        <p className="mt-2 font-medium">{b.occasion ?? typeLabel}</p>
        {place && <p className="text-sm text-muted">{place}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={updateBookingStatus}>
            <input type="hidden" name="booking_id" value={b.id} />
            <input type="hidden" name="status" value="accepted" />
            <button
              type="submit"
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              {d.accept}
            </button>
          </form>
          <form action={updateBookingStatus}>
            <input type="hidden" name="booking_id" value={b.id} />
            <input type="hidden" name="status" value="declined" />
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-red-500/50"
            >
              {d.decline}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="ml-auto flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
          >
            {open ? d.less : d.details}
            {chevron}
          </button>
        </div>
        {open && details}
      </div>
    )
  }

  // Overige boekingen = kaart met status-kleurstreep, compact en inklapbaar.
  return (
    <div className="flex overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="w-1 flex-none" style={{ background: stripe }} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold leading-none">
                {dayNum}
                <span className="ml-1 text-[11px] uppercase text-muted">
                  {monthShort}
                </span>
              </span>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-1 truncate text-sm font-medium">
              {b.occasion ?? typeLabel}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {time && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                  {time}
                </span>
              )}
              {place && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                  {place}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            <span className="text-sm font-semibold text-brand">
              {formatEuro(b.gage)}
            </span>
            {chevron}
          </div>
        </button>
        {open && (
          <div className="px-3 pb-3">
            {(b.status === "accepted" || b.status === "paid") && (
              <div className="flex flex-wrap items-center gap-2">
                {b.status === "accepted" && (
                  <>
                    <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted">
                      {d.awaitPayment}
                    </span>
                    <ChatButton id={b.id} label={d.chatClient} />
                  </>
                )}
                {b.status === "paid" && (
                  <>
                    <ChatButton id={b.id} label={d.chatClient} />
                    <form action={updateBookingStatus}>
                      <input type="hidden" name="booking_id" value={b.id} />
                      <input type="hidden" name="status" value="completed" />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
                      >
                        {d.markDone}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
            {details}
          </div>
        )}
      </div>
    </div>
  )
}

// Locatie + navigatie naar het event, "onderweg"-melding met ETA, en de
// GPS-check-in als onvervalsbaar aanwezigheidsbewijs (server-side geverifieerd).
function LocationProof({ b }: { b: DashBooking }) {
  const { locale, t } = useT()
  const d = t.dashboard
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const [busy, setBusy] = useState<null | "enroute" | "checkin">(null)
  const [err, setErr] = useState(false)
  const [, startTransition] = useTransition()

  const timeFmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    })

  // In-app navigatie is mogelijk zodra we adrescoördinaten hebben.
  const canNavigate = b.lat != null && b.lng != null

  // Deelt eenmalig de locatie en roept een server-actie aan (onderweg of check-in).
  // Lukt een hoge-nauwkeurigheid GPS-fix niet (vaak binnenshuis), dan valt hij
  // één keer terug op netwerk-locatie; alleen bij geweigerde toestemming faalt hij.
  function share(kind: "enroute" | "checkin") {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr(true)
      return
    }
    setErr(false)
    setBusy(kind)
    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const fd = new FormData()
          fd.set("booking_id", b.id)
          fd.set("lat", String(pos.coords.latitude))
          fd.set("lng", String(pos.coords.longitude))
          fd.set("accuracy", String(pos.coords.accuracy ?? ""))
          startTransition(async () => {
            if (kind === "enroute") await startEnroute(fd)
            else await checkInBooking(fd)
            setBusy(null)
          })
        },
        (err) => {
          if (err.code !== err.PERMISSION_DENIED && highAccuracy) {
            attempt(false) // val terug op netwerk-locatie
            return
          }
          setBusy(null)
          setErr(true)
        },
        { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 10000 },
      )
    }
    attempt(true)
  }

  const checkedIn = !!b.checkin_at
  const enroute = !!b.enroute_at && !checkedIn
  const dist = b.checkin_distance_m
  const bookerConfirmed = !!b.booker_confirmed_at

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {d.locationTitle}
      </p>
      {b.address && <p className="mt-1 text-sm">{b.address}</p>}
      {canNavigate && (
        <Link
          href={`/dashboard/navigeren/${b.id}`}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 6.8A1.8 1.8 0 1 1 8 4.2a1.8 1.8 0 0 1 0 3.6Z" />
          </svg>
          {d.navigate}
        </Link>
      )}

      {/* Onderweg + ETA (verdwijnt zodra je bent ingecheckt). */}
      {!checkedIn && (
        <div className="mt-4 border-t border-border pt-3">
          {enroute ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand">
                {b.eta
                  ? d.enrouteEta.replace("{eta}", timeFmt(b.eta))
                  : d.enrouteNoEta}
              </span>
              <button
                type="button"
                onClick={() => share("enroute")}
                disabled={busy !== null}
                className="text-xs text-muted underline transition hover:text-foreground disabled:opacity-50"
              >
                {busy === "enroute" ? d.checkInBusy : d.enrouteUpdate}
              </button>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-muted">{d.enrouteHint}</p>
              <button
                type="button"
                onClick={() => share("enroute")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand disabled:opacity-50"
              >
                {busy === "enroute" ? d.checkInBusy : d.enrouteButton}
              </button>
            </>
          )}
        </div>
      )}

      {/* Aanwezigheidsbewijs (GPS-check-in, server-side geverifieerd). */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {d.checkInTitle}
        </p>
        {checkedIn ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-sm">
              {d.checkedInAt.replace(
                "{when}",
                new Date(b.checkin_at!).toLocaleString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              )}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  b.checkin_verified
                    ? "bg-brand/15 text-brand"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                {b.checkin_verified
                  ? d.checkinVerified.replace("{d}", String(dist ?? 0))
                  : d.checkinUnverified}
              </span>
              {bookerConfirmed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-300">
                  {d.bookerConfirmed}
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">{d.checkInHint}</p>
            <button
              type="button"
              onClick={() => share("checkin")}
              disabled={busy !== null}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand/50 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
            >
              {busy === "checkin" ? d.checkInBusy : d.checkInButton}
            </button>
          </>
        )}
        {err && <p className="mt-1.5 text-xs text-red-400">{d.checkInDenied}</p>}
      </div>
    </div>
  )
}

// Eén regel in het detailpaneel. Verbergt zichzelf als er geen waarde is.
function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}
