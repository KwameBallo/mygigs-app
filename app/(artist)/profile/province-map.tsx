"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { NL_MAP_VIEWBOX, NL_PROVINCE_PATHS } from "@/lib/utils/nl-map"
import { PROVINCE_NAMES } from "@/lib/utils/provinces"
import { suggestProvinceRates } from "@/lib/utils/travel"
import { useT } from "@/components/i18n-provider"

type Rates = Record<string, number>
type Point = { x: number; y: number }

// Klikbare kaart van Nederland: elke provincie is een knop met haar bedrag.
// Actief (bedrag > 0) = huisstijl-oranje; de rest regel je met één klik.
export function ProvinceMap({ initial }: { initial: Rates }) {
  const { t } = useT()
  const p = t.profile
  const wrap = useRef<HTMLDivElement>(null)
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const [rates, setRates] = useState<Rates>(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const [centers, setCenters] = useState<Record<string, Point>>({})
  const [note, setNote] = useState<string | null>(null)

  // Middelpunt van elke provincie bepalen voor het prijslabel.
  useLayoutEffect(() => {
    const c: Record<string, Point> = {}
    for (const name of PROVINCE_NAMES) {
      const el = pathRefs.current[name]
      if (el) {
        const b = el.getBBox()
        c[name] = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      }
    }
    setCenters(c)
  }, [])

  function setAmount(name: string, value: number) {
    setRates((r) => {
      const next = { ...r }
      if (value > 0) next[name] = Math.round(value)
      else delete next[name]
      return next
    })
  }

  // "Vul automatisch in": leest thuisprovincie + richtprijs uit het formulier.
  function autoFill() {
    setNote(null)
    const form = wrap.current?.closest("form")
    const province = (
      form?.querySelector('[name="province"]') as HTMLSelectElement | null
    )?.value
    const base = Number(
      (form?.querySelector('[name="base_gage"]') as HTMLInputElement | null)
        ?.value ?? 0,
    )
    if (!province) return setNote(p.autoFillNoProvince)
    if (!base || base <= 0) return setNote(p.autoFillNoBase)

    const suggestions = suggestProvinceRates(province, base)
    setRates(() => {
      const next: Rates = {}
      for (const s of suggestions) if (s.inRange) next[s.province] = s.suggested
      return next
    })
    setNote(p.autoFillDone.replace("{province}", province))
  }

  const active = (name: string) => (rates[name] ?? 0) > 0

  return (
    <div ref={wrap} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={autoFill}
          className="flex items-center gap-2 rounded-full border border-brand/50 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/20"
        >
          {p.autoFill}
        </button>
        <span className="text-xs text-muted">{p.autoFillHint}</span>
      </div>
      {note && <span className="text-xs text-brand">{note}</span>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Kaart */}
        <svg
          viewBox={NL_MAP_VIEWBOX}
          className="w-full max-w-[300px] flex-none select-none"
          role="img"
          aria-label={p.mapAria}
        >
          {PROVINCE_NAMES.map((name) => {
            const on = active(name)
            const isSel = selected === name
            return (
              <path
                key={name}
                ref={(el) => {
                  pathRefs.current[name] = el
                }}
                d={NL_PROVINCE_PATHS[name]}
                onClick={() => setSelected(name)}
                style={{
                  fill: on ? "var(--brand)" : "var(--surface-2)",
                  stroke: isSel ? "var(--brand-strong)" : "var(--border)",
                  strokeWidth: isSel ? 3 : 1,
                  cursor: "pointer",
                  transition: "fill 0.15s ease",
                }}
              />
            )
          })}
          {PROVINCE_NAMES.map((name) => {
            const c = centers[name]
            const amt = rates[name] ?? 0
            if (!c || amt <= 0) return null
            return (
              <text
                key={name}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                pointerEvents="none"
                style={{ fill: "#000", fontSize: 22, fontWeight: 600 }}
              >
                €{amt}
              </text>
            )
          })}
        </svg>

        {/* Bewerk-paneel */}
        <div className="flex-1">
          {selected ? (
            <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
              <p className="text-sm font-medium">{selected}</p>
              <p className="mt-0.5 text-xs text-muted">{p.provinceTotalHint}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-10 w-32 items-center gap-1.5 rounded-xl border border-border bg-surface pl-3 pr-2 focus-within:border-brand">
                  <span className="flex-none text-sm text-muted">€</span>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    autoFocus
                    value={rates[selected] ?? ""}
                    onChange={(e) => setAmount(selected, Number(e.target.value))}
                    placeholder={p.amountPlaceholder}
                    className="h-full w-full bg-transparent text-sm tabular-nums outline-none placeholder:text-muted"
                  />
                </div>
                {active(selected) && (
                  <button
                    type="button"
                    onClick={() => setAmount(selected, 0)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-400/50 hover:text-red-400"
                  >
                    {p.notBookable}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/30 p-4 text-sm text-muted">
              {p.mapEmpty}
            </div>
          )}

          <p className="mt-3 text-xs text-muted">
            {(Object.keys(rates).length === 1
              ? p.provincesBookableOne
              : p.provincesBookableMany
            ).replace("{n}", String(Object.keys(rates).length))}
          </p>
        </div>
      </div>

      {/* Verborgen velden voor opslaan (compatibel met bestaande actie). */}
      {PROVINCE_NAMES.map((name) => {
        const amt = rates[name] ?? 0
        return amt > 0 ? (
          <span key={name}>
            <input type="hidden" name={`prov_${name}`} value="on" />
            <input type="hidden" name={`gage_${name}`} value={amt} />
          </span>
        ) : null
      })}
    </div>
  )
}
