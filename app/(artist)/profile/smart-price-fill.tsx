"use client"

import { useRef, useState } from "react"
import { suggestProvinceRates } from "@/lib/utils/travel"

// Slimme helper: vult op basis van thuisprovincie + richtprijs automatisch
// een rendabel bedrag per provincie in (reiskosten + reistijd verrekend).
export function SmartPriceFill() {
  const anchor = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function fill() {
    setError(null)
    setNote(null)
    const form = anchor.current?.closest("form")
    if (!form) return

    const province = (
      form.querySelector('[name="province"]') as HTMLSelectElement | null
    )?.value
    const baseGage = Number(
      (form.querySelector('[name="base_gage"]') as HTMLInputElement | null)
        ?.value ?? 0,
    )

    if (!province) {
      setError("Kies eerst je thuisprovincie hierboven.")
      return
    }
    if (!baseGage || baseGage <= 0) {
      setError("Vul eerst je richtprijs / basis gage in.")
      return
    }

    const suggestions = suggestProvinceRates(province, baseGage)
    let filled = 0
    for (const s of suggestions) {
      const amount = form.querySelector(
        `[name="gage_${s.province}"]`,
      ) as HTMLInputElement | null
      const check = form.querySelector(
        `[name="prov_${s.province}"]`,
      ) as HTMLInputElement | null
      if (amount) {
        amount.value = String(s.suggested)
        filled++
      }
      // Alleen provincies binnen redelijke reisafstand standaard aanvinken.
      if (check) check.checked = s.inRange
    }
    const active = suggestions.filter((s) => s.inRange).length
    setNote(
      `Ingevuld voor ${filled} provincies vanuit ${province}. ${active} zijn aangevinkt (binnen reisafstand) — pas gerust bedragen of vinkjes aan.`,
    )
  }

  return (
    <div ref={anchor} className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={fill}
        className="flex w-fit items-center gap-2 rounded-full border border-brand/50 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/20"
      >
        ✨ Vul bedragen automatisch in
      </button>
      <span className="text-xs text-muted">
        Op basis van je thuisprovincie + richtprijs, verrekent reiskosten en
        reistijd (~€0,29/km retour + reistijd). Een indicatie — je kunt alles
        aanpassen.
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
      {note && <span className="text-xs text-brand">{note}</span>}
    </div>
  )
}
