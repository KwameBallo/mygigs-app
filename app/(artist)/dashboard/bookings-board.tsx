"use client"

import { useState } from "react"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import type { Database } from "@/types/database"
import { updateBookingStatus, toggleBookingPublic } from "./actions"
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
}

const PUBLIC_STATUSES = ["accepted", "paid", "completed"]
const OPEN = ["pending"]
const CONFIRMED = ["accepted", "paid"]
const DONE = ["completed", "declined", "cancelled"]

type Tab = "open" | "confirmed" | "done"

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

export function BookingsBoard({ bookings }: { bookings: DashBooking[] }) {
  const { t } = useT()
  const d = t.dashboard
  const open = bookings
    .filter((b) => OPEN.includes(b.status))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  const confirmed = bookings.filter((b) => CONFIRMED.includes(b.status))
  const done = bookings.filter((b) => DONE.includes(b.status))

  const [tab, setTab] = useState<Tab>(open.length > 0 ? "open" : "confirmed")

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "open", label: d.tabOpen, count: open.length },
    { key: "confirmed", label: d.tabConfirmed, count: confirmed.length },
    { key: "done", label: d.tabDone, count: done.length },
  ]

  const list = tab === "open" ? open : tab === "confirmed" ? confirmed : done

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                tab === t.key ? "bg-brand/20" : "bg-surface-2"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          {tab === "open"
            ? d.emptyOpen
            : tab === "confirmed"
              ? d.emptyConfirmed
              : d.emptyDone}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {list.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </section>
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

  return (
    <div
      className={`rounded-2xl border bg-surface ${
        u?.urgent ? "border-brand/50" : "border-border"
      }`}
    >
      {/* Kop: klikbaar om details uit/in te klappen */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {typeLabel}
            </span>
            {u && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  u.urgent
                    ? "bg-brand/15 text-brand"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {u.text}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            {eventDate}
            {b.city ? ` · ${b.city}` : ""}
            {b.venue_name ? ` · ${b.venue_name}` : ""}
          </p>
          {b.occasion && (
            <p className="mt-1 truncate text-sm font-medium">{b.occasion}</p>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span className="text-lg font-semibold text-brand">
            {formatEuro(b.gage)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted">
            {open ? d.less : d.details}
            <svg
              viewBox="0 0 12 12"
              className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M2.5 4.5 L6 8 L9.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>

      {/* Detailpaneel */}
      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailRow label={d.rowType} value={typeLabel} />
            <DetailRow label={d.rowOccasion} value={b.occasion} />
            <DetailRow label={d.rowDate} value={eventDate} />
            <DetailRow label={d.rowDuration} value={durationVal} />
            <DetailRow
              label={d.rowTime}
              value={timeRange(b.start_time, b.end_time)}
            />
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
                <dd className="mt-0.5 text-sm text-muted">
                  {d.nameAfterAccept}
                </dd>
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

          {/* Uitbetaling: wat de DJ overhoudt (gage) vs. wat de klant betaalt. */}
          <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm">
            <div className="flex items-center justify-between py-0.5">
              <span className="font-medium">{d.yourGage}</span>
              <span className="font-semibold text-brand">
                {formatEuro(b.gage)}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5 text-muted">
              <span>{d.clientPays}</span>
              <span>{formatEuro(b.total)}</span>
            </div>
          </div>

          {/* Contactgegevens komen vrij na acceptatie (volgende stap). */}
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
      )}

      {/* Acties */}
      <div
        className={`flex flex-wrap items-center gap-2 px-5 pb-5 ${
          open ? "border-t border-border pt-4" : ""
        }`}
      >
        {isPending && (
          <>
            <form action={updateBookingStatus}>
              <input type="hidden" name="booking_id" value={b.id} />
              <input type="hidden" name="status" value="accepted" />
              <button
                type="submit"
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
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
          </>
        )}

        {CONFIRMED.includes(b.status) && (
          <form action={openBookingChat}>
            <input type="hidden" name="booking_id" value={b.id} />
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
            >
              {d.chatClient}
            </button>
          </form>
        )}

        {PUBLIC_STATUSES.includes(b.status) && (
          <form action={toggleBookingPublic}>
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
