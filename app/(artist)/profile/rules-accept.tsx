"use client"

import { useState, useTransition } from "react"
import { useT } from "@/components/i18n-provider"
import { acceptHouseRules } from "./actions"

// Akkoordbalk onder de huisregels. Zonder akkoord is het profiel niet zichtbaar
// voor organisatoren, dus dit is bewust een blokkerende stap en geen voetnoot.
export function RulesAccept({
  acceptedAt,
  currentVersion,
  acceptedVersion,
}: {
  acceptedAt: string | null
  currentVersion: number
  acceptedVersion: number | null
}) {
  const { t, locale } = useT()
  const p = t.profile
  const [checked, setChecked] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const upToDate =
    Boolean(acceptedAt) && (acceptedVersion ?? 0) >= currentVersion
  const outdated = Boolean(acceptedAt) && !upToDate

  if ((upToDate || done) && !outdated) {
    const when = acceptedAt
      ? new Date(acceptedAt).toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand/35 bg-brand/10 px-4 py-3 text-sm">
        <span aria-hidden="true" className="text-brand">
          ✓
        </span>
        <span className="text-muted">
          {done || !when ? p.rulesAcceptedNow : p.rulesAcceptedOn.replace("{date}", when)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
      {outdated && <p className="text-xs text-brand">{p.rulesUpdated}</p>}

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
        />
        <span className="text-muted">{p.rulesConfirm}</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!checked || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              const ok = await acceptHouseRules()
              if (ok) setDone(true)
              else setError(p.rulesFailed)
            })
          }
          className="w-fit rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-black transition disabled:opacity-40"
        >
          {pending ? p.rulesSaving : p.rulesAcceptButton}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  )
}
