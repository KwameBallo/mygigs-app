"use client"

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
          <form
            key={d.date}
            action={saveAvailabilityTime}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface-2 p-3"
          >
            <input type="hidden" name="date" value={d.date} />
            <span className="w-24 flex-none text-sm font-medium">
              {label(d.date, dateLocale)}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              {a.from}
              <input
                type="time"
                name="start"
                defaultValue={hhmm(d.start)}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="input h-9 w-28"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              {a.to}
              <input
                type="time"
                name="end"
                defaultValue={hhmm(d.end)}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="input h-9 w-28"
              />
            </label>
          </form>
        ))}
      </div>
    </div>
  )
}
