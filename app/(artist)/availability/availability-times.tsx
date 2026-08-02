"use client"

import { useState } from "react"
import { saveAvailabilityTime } from "./actions"
import { useT } from "@/components/i18n-provider"

type Day = { date: string; start: string | null; end: string | null }

function label(date: string, dateLocale: string) {
  return new Date(date).toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

// "18:00:00" → "18:00" (input[type=time] verwacht HH:MM).
function hhmm(t: string | null) {
  return t ? t.slice(0, 5) : ""
}

function DayRow({
  day,
  dateLocale,
  a,
}: {
  day: Day
  dateLocale: string
  a: ReturnType<typeof useT>["t"]["agenda"]
}) {
  const [start, setStart] = useState(hhmm(day.start))
  const [end, setEnd] = useState(hhmm(day.end))
  const allDay = !start && !end

  return (
    <form
      action={saveAvailabilityTime}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface-2 p-3"
    >
      <input type="hidden" name="date" value={day.date} />
      <span className="w-24 flex-none text-sm font-medium">
        {label(day.date, dateLocale)}
      </span>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        {a.from}
        <input
          type="time"
          name="start"
          value={start}
          onChange={(e) => {
            setStart(e.currentTarget.value)
            e.currentTarget.form?.requestSubmit()
          }}
          className="input h-9 w-28"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        {a.to}
        <input
          type="time"
          name="end"
          value={end}
          onChange={(e) => {
            setEnd(e.currentTarget.value)
            e.currentTarget.form?.requestSubmit()
          }}
          className="input h-9 w-28"
        />
      </label>
      {allDay && (
        <span className="inline-flex items-center rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
          {a.allDay}
        </span>
      )}
    </form>
  )
}

export function AvailabilityTimes({ days }: { days: Day[] }) {
  const { locale, t } = useT()
  const a = t.agenda
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  if (days.length === 0) return null

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">{a.timesTitle}</h2>
      <p className="mt-1 text-xs text-muted">{a.timesIntro}</p>

      <div className="mt-3 flex flex-col gap-2">
        {days.map((d) => (
          <DayRow key={d.date} day={d} dateLocale={dateLocale} a={a} />
        ))}
      </div>
    </div>
  )
}
