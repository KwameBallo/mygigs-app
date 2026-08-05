"use client"

import { Fragment, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveAvailabilityTime, toggleAvailability } from "./actions"
import { useT } from "@/components/i18n-provider"

type Slot = {
  date: string
  status: string
  start_time?: string | null
  end_time?: string | null
}
type Times = { start: string; end: string }

function pad(n: number) {
  return String(n).padStart(2, "0")
}

// "18:00:00" → "18:00" (input[type=time] verwacht HH:MM).
function hhmm(t: string | null | undefined) {
  return t ? t.slice(0, 5) : ""
}

export function AvailabilityCalendar({
  slots,
  today,
  bookedDates,
}: {
  slots: Slot[]
  today: string
  bookedDates: string[]
}) {
  const router = useRouter()
  const { locale, t } = useT()
  const a = t.agenda
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  // Dagen met een geboekt optreden (uit de boekingen) — groen gemarkeerd. Je
  // blijft er op andere tijden beschikbaar, dus de dag is nog aan te tikken.
  const booked = useMemo(() => new Set(bookedDates), [bookedDates])
  const [available, setAvailable] = useState<Set<string>>(
    () =>
      new Set(
        slots.filter((s) => s.status === "available").map((s) => s.date),
      ),
  )
  // Per-dag tijden (van/tot). Leeg = hele dag.
  const [times, setTimes] = useState<Record<string, Times>>(() =>
    Object.fromEntries(
      slots
        .filter((s) => s.status === "available")
        .map((s) => [
          s.date,
          { start: hhmm(s.start_time), end: hhmm(s.end_time) },
        ]),
    ),
  )
  // Sync met verse server-data na een refresh.
  useEffect(() => {
    setAvailable(
      new Set(slots.filter((s) => s.status === "available").map((s) => s.date)),
    )
    setTimes(
      Object.fromEntries(
        slots
          .filter((s) => s.status === "available")
          .map((s) => [
            s.date,
            { start: hhmm(s.start_time), end: hhmm(s.end_time) },
          ]),
      ),
    )
  }, [slots])

  const [selected, setSelected] = useState<string | null>(null)

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
  // In weken (rijen van 7) hakken, zodat we de editor direct ónder de rij van
  // de gekozen dag kunnen tonen.
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const canGoPrev = view.y > ty || (view.y === ty && view.m > tmonth - 1)
  const availableCount = [...available].filter((d) => d >= today).length

  function shift(delta: number) {
    setSelected(null)
    setView((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function onDayClick(dateStr: string) {
    if (dateStr < today) return
    if (available.has(dateStr)) {
      // Al beschikbaar: editor openen (of sluiten als je 'm nogmaals aantikt).
      setSelected((cur) => (cur === dateStr ? null : dateStr))
      return
    }
    // Nog niet beschikbaar: meteen aanzetten en de editor openen.
    setAvailable((prev) => new Set(prev).add(dateStr))
    setTimes((prev) => ({ ...prev, [dateStr]: { start: "", end: "" } }))
    setSelected(dateStr)
    setBusyDate(dateStr)
    startTransition(async () => {
      await toggleAvailability(dateStr)
      router.refresh()
      setBusyDate(null)
    })
  }

  function persistTimes(dateStr: string, next: Times) {
    setTimes((prev) => ({ ...prev, [dateStr]: next }))
    setBusyDate(dateStr)
    startTransition(async () => {
      const fd = new FormData()
      fd.set("date", dateStr)
      fd.set("start", next.start)
      fd.set("end", next.end)
      await saveAvailabilityTime(fd)
      setBusyDate(null)
    })
  }

  function removeDay(dateStr: string) {
    setAvailable((prev) => {
      const n = new Set(prev)
      n.delete(dateStr)
      return n
    })
    setSelected(null)
    setBusyDate(dateStr)
    startTransition(async () => {
      await toggleAvailability(dateStr)
      router.refresh()
      setBusyDate(null)
    })
  }

  function renderEditor(dateStr: string) {
    const tm = times[dateStr] ?? { start: "", end: "" }
    const allDay = !tm.start && !tm.end
    return (
      <div className="col-span-7 mt-1 rounded-xl border border-brand/40 bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold">
            {new Date(dateStr).toLocaleDateString(dateLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="×"
            className="-mr-1 -mt-1 rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persistTimes(dateStr, { start: "", end: "" })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              allDay
                ? "border-brand bg-brand/20 text-brand"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {a.allDay}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {a.from}
            <input
              type="time"
              value={tm.start}
              onChange={(e) =>
                persistTimes(dateStr, { ...tm, start: e.currentTarget.value })
              }
              className="input h-9 w-28"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {a.to}
            <input
              type="time"
              value={tm.end}
              onChange={(e) =>
                persistTimes(dateStr, { ...tm, end: e.currentTarget.value })
              }
              className="input h-9 w-28"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{a.editHint}</span>
          <button
            type="button"
            onClick={() => removeDay(dateStr)}
            className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
          >
            {a.setUnavailable}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoPrev && shift(-1)}
          disabled={!canGoPrev}
          aria-label={a.prevMonth}
          className="rounded-lg px-3 py-1.5 text-lg text-muted transition hover:text-foreground disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm font-semibold">
          {a.months[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={a.nextMonth}
          className="rounded-lg px-3 py-1.5 text-lg text-muted transition hover:text-foreground"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {a.weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.map((week, wi) => {
          const selInWeek =
            selected && week.includes(selected) ? selected : null
          return (
            <Fragment key={wi}>
              {week.map((dateStr, i) => {
                if (!dateStr) return <div key={`b${wi}-${i}`} />
                const isPast = dateStr < today
                const isToday = dateStr === today
                const isBooked = booked.has(dateStr)
                const isAvailable = available.has(dateStr)
                const isSelected = selected === dateStr

                let cls =
                  "border-border bg-surface-2 text-foreground hover:border-brand/50"
                if (isBooked) {
                  cls =
                    "border-green-500/50 bg-green-500/20 text-green-300 hover:bg-green-500/30"
                } else if (isAvailable) {
                  cls = "border-brand bg-brand/20 text-brand hover:bg-brand/30"
                } else if (isPast) {
                  cls = "border-transparent text-muted/30 cursor-not-allowed"
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isPast}
                    onClick={() => onDayClick(dateStr)}
                    className={`aspect-square rounded-lg border text-sm font-medium transition ${cls} ${
                      isSelected
                        ? "ring-2 ring-inset ring-foreground"
                        : isToday
                          ? "ring-1 ring-inset ring-foreground/40"
                          : ""
                    } ${busyDate === dateStr ? "opacity-60" : ""}`}
                  >
                    {Number(dateStr.slice(8))}
                  </button>
                )
              })}
              {selInWeek && renderEditor(selInWeek)}
            </Fragment>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> {a.available}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> {a.booked}
        </span>
        <span className="ml-auto">
          {availableCount} {a.daysAvailable}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">{a.calendarHint}</p>
    </div>
  )
}
