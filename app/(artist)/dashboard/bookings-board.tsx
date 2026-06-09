"use client"

import { useState } from "react"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import type { Database } from "@/types/database"
import { updateBookingStatus, toggleBookingPublic } from "./actions"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

export type DashBooking = {
  id: string
  status: BookingStatus
  event_date: string
  city: string | null
  venue_name: string | null
  message: string | null
  gage: number
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

function urgencyLabel(iso: string) {
  const d = daysAgo(iso)
  if (d <= 0) return { text: "Nieuw vandaag", urgent: false }
  if (d === 1) return { text: "1 dag open", urgent: false }
  return { text: `${d} dagen open`, urgent: d >= 3 }
}

export function BookingsBoard({ bookings }: { bookings: DashBooking[] }) {
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
    { key: "open", label: "Open", count: open.length },
    { key: "confirmed", label: "Bevestigd", count: confirmed.length },
    { key: "done", label: "Afgerond", count: done.length },
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
            ? "Geen openstaande aanvragen. Zodra een boeker je boekt, verschijnt het hier."
            : tab === "confirmed"
              ? "Nog geen bevestigde boekingen."
              : "Nog geen afgeronde boekingen."}
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
  const isPending = b.status === "pending"
  const u = isPending ? urgencyLabel(b.created_at) : null
  const eventDate = new Date(b.event_date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div
      className={`rounded-2xl border bg-surface p-5 ${
        u?.urgent ? "border-brand/50" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
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
          {b.message && (
            <p className="mt-2 max-w-lg text-sm text-muted">“{b.message}”</p>
          )}
        </div>
        <span className="flex-none text-lg font-semibold text-brand">
          {formatEuro(b.gage)}
        </span>
      </div>

      {/* Acties */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isPending && (
          <>
            <form action={updateBookingStatus}>
              <input type="hidden" name="booking_id" value={b.id} />
              <input type="hidden" name="status" value="accepted" />
              <button
                type="submit"
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
              >
                Accepteer
              </button>
            </form>
            <form action={updateBookingStatus}>
              <input type="hidden" name="booking_id" value={b.id} />
              <input type="hidden" name="status" value="declined" />
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-red-500/50"
              >
                Weiger
              </button>
            </form>
          </>
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
              {b.is_public ? "Zichtbaar voor fans" : "Toon op publiek profiel"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
