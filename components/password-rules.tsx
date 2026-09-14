"use client"

import { useT } from "@/components/i18n-provider"
import { passwordChecks, type PasswordRuleKey } from "@/lib/password"

// Het vinkjeslijstje onder een wachtwoordveld.
//
// Alle eisen staan er meteen, ook als het veld nog leeg is: dan weet je vooraf
// waar je aan toe bent in plaats van dat je het na het verzenden te horen
// krijgt. Een eis die je haalt wordt oranje met een vinkje en blijft staan, hij
// verdwijnt niet, want anders weet je niet meer wat je al goed had.
export function PasswordRules({ password }: { password: string }) {
  const { t } = useT()
  const a = t.auth
  const checks = passwordChecks(password)

  const label: Record<PasswordRuleKey, string> = {
    length: a.pwRuleLength,
    upper: a.pwRuleUpper,
    lower: a.pwRuleLower,
    digit: a.pwRuleDigit,
  }

  const done = checks.filter((c) => c.ok).length
  const all = done === checks.length

  return (
    <div className="mt-1 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
      <p
        className={`text-xs font-medium transition-colors ${
          all ? "text-brand" : "text-muted"
        }`}
      >
        {all ? a.pwRuleAllDone : a.pwRuleTitle}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {checks.map((c) => (
          <li
            key={c.key}
            className={`flex items-center gap-2 text-xs transition-colors ${
              c.ok ? "text-brand" : "text-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[10px] leading-none transition ${
                c.ok
                  ? "border-brand bg-brand font-bold text-black"
                  : "border-border"
              }`}
            >
              {c.ok ? "✓" : ""}
            </span>
            <span>{label[c.key]}</span>
            {/* Voor een schermlezer: zeg of de eis gehaald is, want kleur en
                een vinkje zijn daar niet genoeg. */}
            <span className="sr-only">
              {c.ok ? a.pwRuleMet : a.pwRuleNotMet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
