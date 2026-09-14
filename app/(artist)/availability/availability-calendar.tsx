"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setAvailabilityBulk, removeAvailabilityBulk } from "./actions"
import { useT } from "@/components/i18n-provider"

// De beschikbaarheidskalender.
//
// Werkwijze: tik zoveel dagen aan als je wilt, stel daaronder één keer je
// tijden in, en druk op "Schema doorvoeren". Pas dán gaat er iets naar de
// database. Sluit je het paneel of ververs je de pagina, dan is je selectie weg
// en is er niets veranderd. Dat is bewust: een agenda die zichzelf opslaat
// terwijl je nog aan het kijken bent, klopt nooit.

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

  // Dagen met een geboekt optreden (uit de boekingen), groen gemarkeerd. Je
  // blijft er op andere tijden beschikbaar, dus de dag is nog aan te tikken.
  const booked = useMemo(() => new Set(bookedDates), [bookedDates])

  // Wat er is opgeslagen.
  const [available, setAvailable] = useState<Set<string>>(
    () =>
      new Set(slots.filter((s) => s.status === "available").map((s) => s.date)),
  )
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

  // Wat je nu hebt aangetikt en nog niet hebt doorgevoerd.
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const pickedList = useMemo(() => [...picked].sort(), [picked])

  // Concept-tijden, geldig voor álle aangetikte dagen.
  const [draftStart, setDraftStart] = useState("")
  const [draftEnd, setDraftEnd] = useState("")
  const [draftAllDay, setDraftAllDay] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [removeConfirming, setRemoveConfirming] = useState(false)
  const [timeErr, setTimeErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  // Eén dag aangetikt die al is opgeslagen? Dan de bestaande tijden invullen,
  // zodat aanpassen net zo makkelijk is als toevoegen. Bij meerdere dagen laten
  // we staan wat de DJ zelf heeft ingevuld.
  useEffect(() => {
    setConfirming(false)
    setRemoveConfirming(false)
    setTimeErr(false)
    if (picked.size === 0) {
      setDraftAllDay(true)
      setDraftStart("")
      setDraftEnd("")
      return
    }
    if (picked.size === 1) {
      const only = [...picked][0]
      const tm = times[only] ?? { start: "", end: "" }
      setDraftAllDay(!tm.start && !tm.end)
      setDraftStart(tm.start)
      setDraftEnd(tm.end)
    }
  }, [picked, times])

  const [ty, tmonth] = today.split("-").map(Number) // jaar, maand (1-12)
  const [view, setView] = useState({ y: ty, m: tmonth - 1 }) // m = 0-11

  const jsDay = new Date(view.y, view.m, 1).getDay() // 0=zo … 6=za
  const leading = (jsDay + 6) % 7 // maandag-eerst
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${view.y}-${pad(view.m + 1)}-${pad(d)}`)
  }

  const canGoPrev = view.y > ty || (view.y === ty && view.m > tmonth - 1)
  const availableCount = [...available].filter((d) => d >= today).length
  // Zit er een al opgeslagen dag in de selectie? Dan kun je ook verwijderen.
  const anySaved = pickedList.some((d) => available.has(d))

  function shift(delta: number) {
    // De selectie blijft staan: zo kun je over de maandgrens heen dagen
    // aantikken en ze in één keer doorvoeren.
    setView((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function toggleDay(dateStr: string) {
    if (dateStr < today || busy) return
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(dateStr)) n.delete(dateStr)
      else n.add(dateStr)
      return n
    })
  }

  // Stap 1: valideren en om bevestiging vragen.
  function requestApply() {
    if (!draftAllDay && (!draftStart || !draftEnd || draftStart >= draftEnd)) {
      setTimeErr(true)
      return
    }
    setTimeErr(false)
    setConfirming(true)
  }

  // Stap 2: bevestigd. Alle aangetikte dagen in één serveraanroep.
  function applyAll() {
    const next = draftAllDay
      ? { start: "", end: "" }
      : { start: draftStart, end: draftEnd }
    const dates = [...pickedList]

    setAvailable((prev) => {
      const n = new Set(prev)
      for (const d of dates) n.add(d)
      return n
    })
    setTimes((prev) => {
      const n = { ...prev }
      for (const d of dates) n[d] = next
      return n
    })
    setPicked(new Set())
    setBusy(true)
    startTransition(async () => {
      const fd = new FormData()
      fd.set("dates", dates.join(","))
      fd.set("start", next.start)
      fd.set("end", next.end)
      await setAvailabilityBulk(fd)
      router.refresh()
      setBusy(false)
    })
  }

  function removeAll() {
    const dates = pickedList.filter((d) => available.has(d))
    setAvailable((prev) => {
      const n = new Set(prev)
      for (const d of dates) n.delete(d)
      return n
    })
    setPicked(new Set())
    setBusy(true)
    startTransition(async () => {
      const fd = new FormData()
      fd.set("dates", dates.join(","))
      await removeAvailabilityBulk(fd)
      router.refresh()
      setBusy(false)
    })
  }

  const dayLabel = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })

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
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`b${i}`} />
          const isPast = dateStr < today
          const isToday = dateStr === today
          const isBooked = booked.has(dateStr)
          const isAvailable = available.has(dateStr)
          const isPicked = picked.has(dateStr)

          let cls =
            "border-border bg-surface-2 text-foreground hover:border-brand/50"
          if (isBooked) {
            cls =
              "border-green-500/50 bg-green-500/20 text-green-300 hover:bg-green-500/30"
          } else if (isAvailable) {
            cls = "border-brand bg-brand/20 text-brand hover:bg-brand/30"
          } else if (isPicked) {
            // Aangetikt maar nog niet opgeslagen: stippellijn en bleker, zodat
            // je in één oogopslag ziet dat deze dag nog niet telt.
            cls =
              "border-dashed border-brand/70 bg-brand/5 text-brand/70 hover:bg-brand/10"
          } else if (isPast) {
            cls = "border-transparent text-muted/30 cursor-not-allowed"
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              aria-pressed={isPicked}
              onClick={() => toggleDay(dateStr)}
              className={`aspect-square rounded-lg border text-sm font-medium transition ${cls} ${
                isPicked
                  ? "ring-2 ring-inset ring-foreground"
                  : isToday
                    ? "ring-1 ring-inset ring-foreground/40"
                    : ""
              } ${busy ? "opacity-60" : ""}`}
            >
              {Number(dateStr.slice(8))}
            </button>
          )
        })}
      </div>

      {/* Het paneel verschijnt zodra je iets hebt aangetikt en verdwijnt weer
          zodra je alles hebt doorgevoerd of de selectie leegmaakt. */}
      {pickedList.length > 0 && (
        <div className="mt-4 rounded-xl border border-brand/40 bg-surface-2 p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">
              {pickedList.length === 1
                ? a.pickedOne
                : a.pickedMany.replace("{n}", String(pickedList.length))}
            </span>
            <span className="text-xs text-muted">
              {pickedList.map(dayLabel).join(", ")}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              {a.from}
              <input
                type="time"
                value={draftStart}
                disabled={draftAllDay}
                onChange={(e) => {
                  setDraftStart(e.currentTarget.value)
                  setDraftAllDay(false)
                  setTimeErr(false)
                }}
                className="input h-9 w-28 disabled:opacity-40"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              {a.to}
              <input
                type="time"
                value={draftEnd}
                disabled={draftAllDay}
                onChange={(e) => {
                  setDraftEnd(e.currentTarget.value)
                  setDraftAllDay(false)
                  setTimeErr(false)
                }}
                className="input h-9 w-28 disabled:opacity-40"
              />
            </label>
          </div>

          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftAllDay}
              onChange={(e) => {
                const c = e.currentTarget.checked
                setDraftAllDay(c)
                setTimeErr(false)
                if (c) {
                  setDraftStart("")
                  setDraftEnd("")
                }
              }}
              className="h-4 w-4 accent-[#ff6a00]"
            />
            {a.allDayLabel}
          </label>

          {pickedList.length > 1 && (
            <p className="mt-2 text-xs text-muted">{a.pickedTimesHint}</p>
          )}

          <p className="mt-3 rounded-lg border border-brand/40 bg-brand/5 px-3 py-2 text-xs leading-relaxed text-brand">
            {a.draftHint}
          </p>

          {timeErr && <p className="mt-2 text-xs text-red-400">{a.timeError}</p>}

          {confirming ? (
            <div className="mt-4 rounded-xl border border-brand/40 bg-surface p-3">
              <p className="text-sm font-medium">
                {pickedList.length === 1
                  ? a.confirmScheduleQ
                  : a.confirmScheduleMulti.replace(
                      "{n}",
                      String(pickedList.length),
                    )}
              </p>
              <p className="mt-1 text-xs text-muted">
                {draftAllDay
                  ? a.allDay
                  : `${a.from} ${draftStart} ${a.to} ${draftEnd}`}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyAll}
                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-brand-strong"
                >
                  {a.confirmYes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  {a.confirmBack}
                </button>
              </div>
            </div>
          ) : removeConfirming ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-surface p-3">
              <p className="text-sm font-medium">
                {pickedList.length === 1
                  ? a.removeDayQ
                  : a.removeDaysQ.replace("{n}", String(pickedList.length))}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={removeAll}
                  className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                >
                  {a.removeYes}
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveConfirming(false)}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  {a.confirmBack}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
              >
                {a.cancelDraft}
              </button>
              {anySaved && (
                <button
                  type="button"
                  onClick={() => setRemoveConfirming(true)}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition hover:border-red-500/50 hover:text-red-300"
                >
                  {a.setUnavailable}
                </button>
              )}
              <button
                type="button"
                onClick={requestApply}
                disabled={busy}
                className="ml-auto rounded-full bg-brand px-5 py-2 text-xs font-semibold text-black transition hover:bg-brand-strong disabled:opacity-50"
              >
                {a.applySchedule}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> {a.available}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> {a.booked}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-brand/70" />
          {a.draftLegend}
        </span>
        <span className="ml-auto">
          {availableCount} {a.daysAvailable}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">{a.calendarHint}</p>
    </div>
  )
}
