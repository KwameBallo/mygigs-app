"use client"

import { useMemo, useState, useTransition } from "react"
import { toggleAvailability } from "./actions"

type Slot = { date: string; status: string }

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"]
const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function AvailabilityCalendar({
  slots,
  today,
}: {
  slots: Slot[]
  today: string
}) {
  const statusByDate = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of slots) m.set(s.date, s.status)
    return m
  }, [slots])

  const [ty, tmonth] = today.split("-").map(Number) // jaar, maand (1-12)
  const [view, setView] = useState({ y: ty, m: tmonth - 1 }) // m = 0-11
  const [, startTransition] = useTransition()
  const [busyDate, setBusyDate] = useState<string | null>(null)

  const jsDay = new Date(view.y, view.m, 1).getDay() // 0=zo … 6=za
  const leading = (jsDay + 6) % 7 // maandag-eerst
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${view.y}-${pad(view.m + 1)}-${pad(d)}`)
  }

  // Niet vóór de huidige maand navigeren (verleden heeft geen zin).
  const canGoPrev = view.y > ty || (view.y === ty && view.m > tmonth - 1)

  const availableCount = slots.filter(
    (s) => s.status === "available" && s.date >= today,
  ).length

  function shift(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function onToggle(dateStr: string) {
    if (statusByDate.get(dateStr) === "booked" || dateStr < today) return
    setBusyDate(dateStr)
    startTransition(async () => {
      await toggleAvailability(dateStr)
      setBusyDate(null)
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoPrev && shift(-1)}
          disabled={!canGoPrev}
          aria-label="Vorige maand"
          className="rounded-lg px-3 py-1.5 text-lg text-muted transition hover:text-foreground disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Volgende maand"
          className="rounded-lg px-3 py-1.5 text-lg text-muted transition hover:text-foreground"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`b${i}`} />
          const status = statusByDate.get(dateStr)
          const isPast = dateStr < today
          const isToday = dateStr === today
          const booked = status === "booked"
          const available = status === "available"
          const day = Number(dateStr.slice(8))

          let cls =
            "border-border bg-surface-2 text-foreground hover:border-brand/50"
          if (booked) {
            cls = "border-red-500/40 bg-red-500/15 text-red-300 cursor-not-allowed"
          } else if (available) {
            cls = "border-brand/50 bg-brand/15 text-brand hover:bg-brand/25"
          } else if (isPast) {
            cls = "border-transparent text-muted/30 cursor-not-allowed"
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast || booked || busyDate === dateStr}
              onClick={() => onToggle(dateStr)}
              className={`aspect-square rounded-lg border text-sm font-medium transition ${cls} ${
                isToday ? "ring-1 ring-brand" : ""
              } ${busyDate === dateStr ? "opacity-50" : ""}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Beschikbaar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Geboekt
        </span>
        <span className="ml-auto">{availableCount} dagen beschikbaar</span>
      </div>
      <p className="mt-3 text-xs text-muted">
        Tik op een dag om je beschikbaarheid aan of uit te zetten. Geboekte dagen
        kun je niet wijzigen.
      </p>
    </div>
  )
}
