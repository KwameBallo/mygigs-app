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

// Assen-bovengrens afronden op een net getal (1/2/5 × 10^n).
function niceMax(v: number) {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return m * pow
}

const W = 340
const H = 150
const PAD_L = 38
const PAD_R = 10
const PAD_T = 12
const PAD_B = 22
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B
const TICKS = [0, 0.25, 0.5, 0.75, 1]

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

  const xAt = (i: number) => PAD_L + (i / 11) * PLOT_W

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
          const nm = niceMax(Math.max(...curVals, ...(cmpVals ?? [])))
          const yAt = (v: number) => PAD_T + PLOT_H - (v / nm) * PLOT_H
          const linePath = (vals: number[]) =>
            vals
              .map(
                (v, i) =>
                  `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`,
              )
              .join(" ")
          const axisFmt = (v: number) => {
            const k = v >= 1000
            const num = k
              ? (v / 1000).toLocaleString(dateLocale, {
                  maximumFractionDigits: 1,
                }) + "k"
              : String(Math.round(v))
            return m.euro ? "€" + num : num
          }

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

              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ height: "auto", display: "block" }}
                className="mt-3"
                role="img"
                aria-label={`${t[m.labelKey]} ${current.year}`}
              >
                {TICKS.map((f, ti) => {
                  const gy = PAD_T + PLOT_H * (1 - f)
                  return (
                    <g key={ti}>
                      <line
                        x1={PAD_L}
                        y1={gy}
                        x2={PAD_L + PLOT_W}
                        y2={gy}
                        stroke="var(--border)"
                        strokeWidth={1}
                        opacity={0.6}
                      />
                      <text
                        x={PAD_L - 6}
                        y={gy + 3}
                        textAnchor="end"
                        fontSize={9}
                        fill="var(--muted)"
                      >
                        {axisFmt(nm * f)}
                      </text>
                    </g>
                  )
                })}
                {monthLabels.map((ml, i) => (
                  <text
                    key={i}
                    x={xAt(i)}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--muted)"
                  >
                    {ml.slice(0, 1)}
                  </text>
                ))}
                {cmpVals && (
                  <>
                    <path
                      d={linePath(cmpVals)}
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {cmpVals.map((v, i) => (
                      <circle
                        key={i}
                        cx={xAt(i)}
                        cy={yAt(v)}
                        r={2}
                        fill="var(--muted)"
                      >
                        <title>{`${monthLabels[i]} ${compareData!.year}: ${fmt(v, m.euro)}`}</title>
                      </circle>
                    ))}
                  </>
                )}
                <path
                  d={linePath(curVals)}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {curVals.map((v, i) => (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(v)}
                    r={2.5}
                    fill="var(--brand)"
                  >
                    <title>{`${monthLabels[i]} ${current.year}: ${fmt(v, m.euro)}`}</title>
                  </circle>
                ))}
              </svg>

              {cmpVals && (
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm bg-brand" />
                    {current.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-3 rounded-sm bg-muted" />
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
