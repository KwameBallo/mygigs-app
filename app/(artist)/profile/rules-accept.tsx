"use client"

import { useState } from "react"
import { useT } from "@/components/i18n-provider"
import { HouseRules } from "@/components/house-rules"
import { RulesSlides } from "@/components/rules-slides"
import { houseRules } from "@/lib/rules"
import { acceptHouseRules } from "./actions"

// Het huisregelblok op het DJ-profiel. Akkoord geven kan alleen via de
// doorklikker: elke afspraak apart in beeld, de akkoordknop pas op het laatste
// scherm. Wie al akkoord ging krijgt de bevestiging met datum, en kan de
// afspraken teruglezen wanneer hij wil.
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
  const [open, setOpen] = useState(false)
  const [justAccepted, setJustAccepted] = useState(false)

  const upToDate =
    (Boolean(acceptedAt) && (acceptedVersion ?? 0) >= currentVersion) ||
    justAccepted
  const outdated = Boolean(acceptedAt) && !upToDate

  const when =
    acceptedAt && !justAccepted
      ? new Date(acceptedAt).toLocaleDateString(
          locale === "en" ? "en-GB" : "nl-NL",
          { day: "numeric", month: "long", year: "numeric" },
        )
      : null

  async function handleAccept() {
    const ok = await acceptHouseRules()
    if (ok) setJustAccepted(true)
    return ok
  }

  return (
    <div className="flex flex-col gap-4">
      {upToDate ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/35 bg-brand/10 px-4 py-3.5 text-sm">
            <span aria-hidden="true" className="text-brand">
              ✓
            </span>
            <span className="text-muted">
              {when ? p.rulesAcceptedOn.replace("{date}", when) : p.rulesAcceptedNow}
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="ml-auto rounded-full border border-border px-4 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              {p.rulesReread}
            </button>
          </div>

          {/* Naslag: alle afspraken onder elkaar, ingeklapt. */}
          <details className="rounded-2xl border border-border bg-surface-2 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              {p.rulesOverview}
            </summary>
            <div className="mt-4">
              <HouseRules
                locale={locale}
                title={p.rulesEyebrow}
                intro={p.rulesIntro}
                promisesTitle={p.rulesPromises}
              />
            </div>
          </details>
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          {/* De sectiekop zegt al "Huisregels", dus hier geen tweede kop. */}
          {outdated && <p className="text-sm font-medium">{p.rulesUpdated}</p>}
          <p className="text-sm leading-relaxed text-muted">
            {p.rulesCtaBody.replace("{total}", String(houseRules(locale).length))}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              {outdated ? p.rulesRereadStart : p.rulesStart}
            </button>
            <span className="text-xs text-muted">{p.rulesIntroTime}</span>
          </div>
        </div>
      )}

      {open && (
        <RulesSlides
          locale={locale}
          mode={upToDate ? "review" : "accept"}
          onClose={() => setOpen(false)}
          onAccept={handleAccept}
        />
      )}
    </div>
  )
}
