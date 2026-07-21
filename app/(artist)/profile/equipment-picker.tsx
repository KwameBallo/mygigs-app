"use client"

import { useState } from "react"
import { useT } from "@/components/i18n-provider"

// De opgeslagen waarde blijft canoniek (Nederlands) zodat bestaande data blijft
// werken; alleen het label wordt vertaald.
const EQUIPMENT = [
  { value: "Microfoon", key: "equipMicrophone" },
  { value: "Draaitafel", key: "equipTurntable" },
  { value: "Speakers", key: "equipSpeakers" },
  { value: "Verlichting", key: "equipLighting" },
  { value: "Bass", key: "equipBass" },
] as const

// De DJ vinkt aan wat hij meebrengt en zet er een huurprijs bij; die prijs
// verschijnt op zijn publieke profiel (apparatuur wordt in feite verhuurd).
export function EquipmentPicker({
  initialItems,
  initialPrices,
}: {
  initialItems: string[]
  initialPrices: Record<string, number>
}) {
  const { t } = useT()
  const p = t.profile
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialItems),
  )

  function toggle(item: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(item)
      else next.delete(item)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {EQUIPMENT.map(({ value: item, key }) => {
        const on = selected.has(item)
        return (
          <div key={item} className="flex items-center gap-2">
            <label
              className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                on
                  ? "border-brand bg-brand/10"
                  : "border-border bg-surface hover:border-brand/40"
              }`}
            >
              <input
                type="checkbox"
                name="equipment_items"
                value={item}
                checked={on}
                onChange={(e) => toggle(item, e.target.checked)}
                className="accent-brand"
              />
              {p[key]}
            </label>
            {/* Prijsvak altijd invulbaar; een bedrag vinkt het item auto aan. */}
            <div className="flex h-10 w-32 items-center gap-1.5 rounded-xl border border-border bg-surface-2 pl-3 pr-2 transition focus-within:border-brand">
              <span className="flex-none text-sm text-muted">€</span>
              <input
                type="number"
                min={0}
                step={5}
                name={`equip_price_${item}`}
                autoComplete="off"
                data-1p-ignore
                defaultValue={initialPrices[item] ?? ""}
                onChange={(e) => {
                  if (Number(e.target.value) > 0 && !on) toggle(item, true)
                }}
                placeholder={p.equipRent}
                className="h-full w-full bg-transparent text-sm tabular-nums outline-none placeholder:text-muted"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
