"use client"

import { createContext, useContext, useMemo, useState } from "react"

type EquipmentSelection = {
  selected: Set<string>
  toggle: (item: string, on: boolean) => void
  equipmentCost: number
}

const Ctx = createContext<EquipmentSelection | null>(null)

// Deelt de door de consument gekozen DJ-apparatuur tussen het profiel-blok
// (waar je kiest) en het boek-blok (waar de prijs meetelt).
export function EquipmentSelectionProvider({
  prices,
  children,
}: {
  prices: Record<string, number>
  children: React.ReactNode
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  function toggle(item: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(item)
      else next.delete(item)
      return next
    })
  }

  const equipmentCost = useMemo(
    () => [...selected].reduce((sum, i) => sum + (Number(prices[i]) || 0), 0),
    [selected, prices],
  )

  return (
    <Ctx.Provider value={{ selected, toggle, equipmentCost }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEquipmentSelection(): EquipmentSelection {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("useEquipmentSelection moet binnen de provider gebruikt worden")
  }
  return ctx
}
