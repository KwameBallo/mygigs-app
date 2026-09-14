"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useT } from "@/components/i18n-provider"
import type { Locale } from "@/lib/i18n/config"
import { houseRules, housePromises } from "@/lib/rules"

// De huisregels als doorklikker: één afspraak per scherm, en pas aan het einde
// de akkoordknop. Zo weten we dat elke regel echt in beeld is geweest, en dat
// is precies wat je nodig hebt als je je er later op wilt beroepen.
//
// Per regel staat de knop kort op slot (DWELL_MS). Niet om te pesten, maar
// omdat twaalf keer doorrammen in twee seconden geen "gelezen" is. Wie
// terugbladert houdt zijn ontgrendelde regels: alleen de eerste keer telt.

const DWELL_MS = 1500

type Slide =
  | { kind: "intro" }
  | {
      kind: "rule"
      n: number
      icon: string
      title: string
      body: string
      note?: string
      core?: boolean
    }
  | { kind: "final" }

export function RulesSlides({
  locale,
  mode,
  onClose,
  onAccept,
}: {
  locale: Locale
  /** "accept" eindigt met de akkoordknop, "review" alleen met sluiten. */
  mode: "accept" | "review"
  onClose: () => void
  onAccept: () => Promise<boolean>
}) {
  const { t } = useT()
  const p = t.profile

  const rules = useMemo(() => houseRules(locale), [locale])
  const slides = useMemo<Slide[]>(
    () => [
      { kind: "intro" },
      ...rules.map((r) => ({ kind: "rule" as const, ...r })),
      { kind: "final" },
    ],
    [rules],
  )

  const [i, setI] = useState(0)
  const [unlocked, setUnlocked] = useState(true)
  const [barFull, setBarFull] = useState(false)
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const read = useRef<Set<number>>(new Set())

  const slide = slides[i]
  const last = i === slides.length - 1
  const ruleCount = rules.length
  const ruleIndex = slide.kind === "rule" ? slide.n : last ? ruleCount : 0

  // Achtergrond niet meescrollen terwijl de lezer openstaat.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Leespauze per nieuw scherm. Al gelezen regels gaan meteen open.
  useEffect(() => {
    const needs = slides[i].kind === "rule" && !read.current.has(i)
    if (!needs) {
      setUnlocked(true)
      setBarFull(false)
      return
    }
    setUnlocked(false)
    setBarFull(false)
    const frame = requestAnimationFrame(() => setBarFull(true))
    const timer = setTimeout(() => {
      read.current.add(i)
      setUnlocked(true)
    }, DWELL_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [i, slides])

  const next = useCallback(() => {
    if (!unlocked) return
    setI((v) => Math.min(v + 1, slides.length - 1))
  }, [unlocked, slides.length])

  const back = useCallback(() => setI((v) => Math.max(v - 1, 0)), [])

  // Pijltjes en Escape, zodat het op een laptop net zo prettig doorklikt.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") back()
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, back, onClose])

  // Vegen op de telefoon.
  const swipe = useRef<number | null>(null)

  async function accept() {
    setSaving(true)
    setError(null)
    const ok = await onAccept()
    setSaving(false)
    if (ok) onClose()
    else setError(p.rulesFailed)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={p.rulesHeading}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl"
        onPointerDown={(e) => {
          swipe.current = e.clientX
        }}
        onPointerUp={(e) => {
          const from = swipe.current
          swipe.current = null
          if (from === null) return
          const dx = e.clientX - from
          if (dx < -60) next()
          else if (dx > 60) back()
        }}
      >
        {/* Kop: waar je bent en hoe je eruit komt. */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {p.rulesEyebrow}
          </p>
          <span className="ml-auto text-xs tabular-nums text-muted">
            {slide.kind === "rule"
              ? p.rulesStep
                  .replace("{n}", String(slide.n))
                  .replace("{total}", String(ruleCount))
              : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={p.rulesClose}
            className="-mr-1 flex h-7 w-7 flex-none items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Voortgang: één streepje per afspraak. */}
        <div className="flex gap-1 px-5 pt-3">
          {rules.map((r) => (
            <span
              key={r.n}
              className={`h-1 flex-1 rounded-full transition-colors ${
                r.n <= ruleIndex ? "bg-brand" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        {/* Het scherm zelf. */}
        <div
          className="flex-1 overflow-y-auto px-5 py-6"
          aria-live="polite"
          key={i}
        >
          {slide.kind === "intro" && (
            <div className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-2xl"
              >
                🤝
              </span>
              <h2 className="text-2xl font-semibold tracking-tight">
                {p.rulesIntroTitle}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {p.rulesIntroBody.replace("{total}", String(ruleCount))}
              </p>
              <p className="text-xs text-muted">{p.rulesIntroTime}</p>
            </div>
          )}

          {slide.kind === "rule" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand text-lg font-bold text-black"
                >
                  {slide.n}
                </span>
                {slide.core && (
                  <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-medium text-brand">
                    {p.rulesCoreLabel}
                  </span>
                )}
              </div>
              <h2 className="flex items-start gap-2 text-2xl font-semibold leading-snug tracking-tight">
                <span aria-hidden="true">{slide.icon}</span>
                <span>{slide.title}</span>
              </h2>
              <p className="text-[15px] leading-relaxed text-muted">
                {slide.body}
              </p>
              {slide.note && (
                <p className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-brand">
                    {p.rulesNote}{" "}
                  </span>
                  {slide.note}
                </p>
              )}
            </div>
          )}

          {slide.kind === "final" && (
            <div className="flex flex-col gap-4">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-2xl"
              >
                ✓
              </span>
              <h2 className="text-2xl font-semibold tracking-tight">
                {p.rulesFinalTitle.replace("{total}", String(ruleCount))}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {p.rulesFinalBody}
              </p>

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                  {p.rulesPromises}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {housePromises(locale).map((line) => (
                    <li key={line} className="flex gap-2 text-xs text-muted">
                      <span aria-hidden="true" className="text-brand">
                        ✓
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {mode === "accept" && (
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
                  />
                  <span className="text-muted">{p.rulesConfirm}</span>
                </label>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>

        {/* Voet: terug en verder. */}
        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={back}
            disabled={i === 0}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground disabled:opacity-30"
          >
            {p.rulesBack}
          </button>

          {!last && (
            <button
              type="button"
              onClick={next}
              disabled={!unlocked}
              className={`relative ml-auto flex-1 overflow-hidden rounded-full px-6 py-2.5 text-sm font-medium transition sm:flex-none ${
                unlocked
                  ? "bg-brand text-black hover:bg-brand-strong"
                  : "cursor-default bg-surface-2 text-muted"
              }`}
            >
              {!unlocked && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-brand/25 transition-[width] ease-linear"
                  style={{
                    width: barFull ? "100%" : "0%",
                    transitionDuration: `${DWELL_MS}ms`,
                  }}
                />
              )}
              <span className="relative">
                {unlocked ? p.rulesNext : p.rulesReading}
              </span>
            </button>
          )}

          {last && mode === "accept" && (
            <button
              type="button"
              onClick={accept}
              disabled={!checked || saving}
              className="ml-auto flex-1 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-40 sm:flex-none"
            >
              {saving ? p.rulesSaving : p.rulesAcceptButton}
            </button>
          )}

          {last && mode === "review" && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex-1 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong sm:flex-none"
            >
              {p.rulesClose}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
