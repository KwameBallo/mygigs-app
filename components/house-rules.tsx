import type { Locale } from "@/lib/i18n/config"
import { coreRules, housePromises, houseRules } from "@/lib/rules"

// De huisregels in de MyGigs-stijl: zwart, oranje accent, genummerde kaarten.
//
// variant "full"    → het complete overzicht op het DJ-profiel
// variant "core"    → de vier regels die op de avond zelf misgaan, kort
// variant "badge"   → één regel geruststelling op het publieke profiel

export function HouseRules({
  locale,
  variant = "full",
  title,
  intro,
  promisesTitle,
}: {
  locale: Locale
  variant?: "full" | "core"
  title: string
  intro?: string
  promisesTitle?: string
}) {
  const rules = variant === "core" ? coreRules(locale) : houseRules(locale)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          {title}
        </p>
        {intro && <p className="mt-1.5 text-sm text-muted">{intro}</p>}
      </div>

      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {rules.map((r) => (
          <li
            key={r.n}
            className={`flex gap-3 rounded-xl border bg-surface p-3.5 transition ${
              r.core ? "border-brand/35" : "border-border"
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand text-sm font-bold text-black"
            >
              {r.n}
            </span>
            <div className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <span aria-hidden="true">{r.icon}</span>
                {r.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{r.body}</p>
              {r.note && (
                <p className="mt-1.5 text-xs leading-relaxed text-brand/80">
                  {r.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {variant === "full" && promisesTitle && (
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {promisesTitle}
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
      )}
    </div>
  )
}

/** Klein keurmerk voor het publieke DJ-profiel. */
export function HouseRulesBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
      <span aria-hidden="true">✓</span>
      {label}
    </span>
  )
}
