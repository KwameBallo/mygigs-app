"use client"

import { useState } from "react"

export type MPoint = {
  bookings: number
  revenue: number
  users: number
  djs: number
}
export type YearData = { year: number; months: MPoint[] }

const METRICS = [
  { key: "bookings", labelKey: "chartBookings", euro: false },
  { key: "revenue", labelKey: "chartRevenue", euro: true },
  { key: "users", labelKey: "chartUsers", euro: false },
  { key: "djs", labelKey: "chartDjs", euro: false },
] as const

export function AdminCharts({
  data,
  locale,
  t,
}: {
  data: YearData[]
  locale: "nl" | "en"
  t: Record<string, string>
}) {
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const [year, setYear] = useState(() =>
    data.length ? data[data.length - 1].year : 0,
  )
  const [compareYear, setCompareYear] = useState<number | null>(() =>
    data.length >= 2 ? data[data.length - 2].year : null,
  )

  if (data.length === 0) {
    return <p className="text-sm text-muted">{t.chartNoData}</p>
  }

  const current = data.find((d) => d.year === year) ?? data[data.length - 1]
  const compareData =
    compareYear != null && compareYear !== current.year
      ? (data.find((d) => d.year === compareYear) ?? null)
      : null

  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(2020, i, 1).toLocaleDateString(dateLocale, { month: "short" }),
  )
  const euro = (n: number) =>
    n.toLocaleString(dateLocale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    })
  const fmt = (n: number, isEuro: boolean) =>
    isEuro ? euro(n) : n.toLocaleString(dateLocale)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {data.map((d) => (
            <button
              key={d.year}
              type="button"
              onClick={() => setYear(d.year)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                d.year === current.year
                  ? "bg-brand text-black"
                  : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {d.year}
            </button>
          ))}
        </div>
        {data.length >= 2 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            {t.chartCompare}
            <select
              value={compareYear ?? ""}
              onChange={(e) =>
                setCompareYear(e.target.value ? Number(e.target.value) : null)
              }
              className="input h-8 w-auto"
            >
              <option value="">{t.chartCompareNone}</option>
              {data
                .filter((d) => d.year !== current.year)
                .map((d) => (
                  <option key={d.year} value={d.year}>
                    {d.year}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {METRICS.map((m) => {
          const curVals = current.months.map((mo) => mo[m.key])
          const cmpVals = compareData
            ? compareData.months.map((mo) => mo[m.key])
            : null
          const total = curVals.reduce((s, v) => s + v, 0)
          const cmpTotal = cmpVals ? cmpVals.reduce((s, v) => s + v, 0) : null
          const growth =
            cmpTotal && cmpTotal > 0
              ? Math.round(((total - cmpTotal) / cmpTotal) * 100)
              : null
          const max = Math.max(1, ...curVals, ...(cmpVals ?? []))

          return (
            <div
              key={m.key}
              className="rounded-2xl border border-border bg-surface-2 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t[m.labelKey]}</p>
                  <p className="mt-0.5 text-lg font-semibold">
                    {fmt(total, m.euro)}
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      {t.chartYearTotal} {current.year}
                    </span>
                  </p>
                </div>
                {growth !== null && compareData && (
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${
                      growth >= 0
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}%{" "}
                    <span className="text-muted">
                      {t.chartVsPrev.replace("{year}", String(compareData.year))}
                    </span>
                  </span>
                )}
              </div>

              <div className="mt-4 flex h-28 items-end gap-1">
                {monthLabels.map((ml, i) => (
                  <div
                    key={i}
                    className="flex flex-1 items-end justify-center gap-0.5"
                  >
                    {cmpVals && (
                      <div
                        title={`${ml} ${compareData!.year}: ${fmt(cmpVals[i], m.euro)}`}
                        className="w-1/2 rounded-t bg-foreground/25"
                        style={{ height: `${(cmpVals[i] / max) * 100}%` }}
                      />
                    )}
                    <div
                      title={`${ml} ${current.year}: ${fmt(curVals[i], m.euro)}`}
                      className={`${cmpVals ? "w-1/2" : "w-full"} rounded-t bg-brand/70 transition-all hover:bg-brand`}
                      style={{ height: `${(curVals[i] / max) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-1">
                {monthLabels.map((ml, i) => (
                  <span
                    key={i}
                    className="flex-1 text-center text-[9px] uppercase text-muted"
                  >
                    {ml.slice(0, 1)}
                  </span>
                ))}
              </div>

              {cmpVals && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-brand/70" />
                    {current.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-foreground/25" />
                    {compareData!.year}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
