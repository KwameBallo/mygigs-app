"use client"

import { useState } from "react"
import Link from "next/link"
import { useEquipmentSelection } from "./equipment-selection"

export type MiniSupplier = {
  id: string
  name: string
  city: string | null
  day_rate: number | null
  image_url: string | null
}

const ALL_EQUIPMENT = ["Microfoon", "Draaitafel", "Speakers", "Bass", "Verlichting"]

// Elk item hoort bij een verhuurcategorie (geluid of licht).
const ITEM_CATEGORY: Record<string, "sound" | "light"> = {
  Microfoon: "sound",
  Draaitafel: "sound",
  Speakers: "sound",
  Bass: "sound",
  Verlichting: "light",
}

export function EquipmentPlanner({
  equipmentItems,
  equipmentPrices,
  equipmentText,
  soundSuppliers,
  lightSuppliers,
}: {
  equipmentItems: string[]
  equipmentPrices: Record<string, number>
  equipmentText: string | null
  soundSuppliers: MiniSupplier[]
  lightSuppliers: MiniSupplier[]
}) {
  const available = ALL_EQUIPMENT.filter((i) => equipmentItems.includes(i))
  const missing = ALL_EQUIPMENT.filter((i) => !equipmentItems.includes(i))

  // Gedeelde selectie met het boek-blok: alleen wat je aanvinkt telt in de prijs.
  const { selected, toggle: toggleDj } = useEquipmentSelection()

  const [needs, setNeeds] = useState<boolean | null>(null)
  const [rent, setRent] = useState<Set<string>>(() => new Set())

  function toggleRent(item: string, on: boolean) {
    setRent((prev) => {
      const next = new Set(prev)
      if (on) next.add(item)
      else next.delete(item)
      return next
    })
  }

  const rentSound = [...rent].some((i) => ITEM_CATEGORY[i] === "sound")
  const rentLight = [...rent].some((i) => ITEM_CATEGORY[i] === "light")

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Apparatuur</h3>

      {/* Wat de DJ ter beschikking heeft — vink aan wat je nodig hebt */}
      {available.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-green-400">
            Beschikbaar bij deze DJ
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Vink aan wat je van de DJ wilt (bij)huren — alleen dit telt bij de
            prijs.
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {available.map((item) => {
              const price = equipmentPrices[item]
              const on = selected.has(item)
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggleDj(item, !on)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      on
                        ? "border-brand bg-brand/10"
                        : "border-border bg-surface-2/50 hover:border-brand/40"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                          on
                            ? "border-brand bg-brand text-black"
                            : "border-muted text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {item}
                    </span>
                    {price != null && price > 0 ? (
                      <span className="font-semibold text-brand">€ {price} huur</span>
                    ) : (
                      <span className="text-xs text-muted">inbegrepen</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Deze DJ neemt geen eigen apparatuur mee.
        </p>
      )}

      {equipmentText && <p className="mt-2 text-sm text-muted">{equipmentText}</p>}

      {/* Gate: heb je apparatuur nodig? */}
      <div className="mt-3 rounded-2xl border border-border bg-surface-2/50 p-4">
        <p className="text-sm font-medium">Heb je apparatuur nodig?</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setNeeds(true)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              needs === true
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:border-brand/50"
            }`}
          >
            Ja
          </button>
          <button
            type="button"
            onClick={() => setNeeds(false)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              needs === false
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:border-brand/50"
            }`}
          >
            Nee
          </button>
        </div>

        {needs === false && (
          <p className="mt-2 text-xs text-muted">
            Top — dan hoef je niets extra te regelen. 👍
          </p>
        )}

        {needs === true &&
          (missing.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Deze DJ heeft alles al bij zich — niets extern nodig. 🎉
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-medium">
                Niet bij deze DJ — huur via een verhuurbedrijf
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Kies wat je nog nodig hebt; dit is niet bij de DJ verkrijgbaar.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map((item) => {
                  const on = rent.has(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleRent(item, !on)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        on
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border text-muted hover:border-brand/50"
                      }`}
                    >
                      {on ? "✓ " : "+ "}
                      {item}
                    </button>
                  )
                })}
              </div>

              {(rentSound || rentLight) && (
                <div className="mt-4 flex flex-col gap-4">
                  <p className="rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
                    Advies: dit heeft de DJ niet — huur het bij een externe
                    verhuurpartij hieronder.
                  </p>
                  {rentSound && (
                    <SupplierList kind="geluid" category="sound" suppliers={soundSuppliers} />
                  )}
                  {rentLight && (
                    <SupplierList kind="licht" category="light" suppliers={lightSuppliers} />
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

function SupplierList({
  kind,
  category,
  suppliers,
}: {
  kind: string
  category: "sound" | "light"
  suppliers: MiniSupplier[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium">Verhuurbedrijven voor {kind}</p>
      {suppliers.length === 0 ? (
        <p className="text-sm text-muted">Nog geen {kind}-verhuurders in de lijst.</p>
      ) : (
        suppliers.map((s) => (
          <Link
            key={s.id}
            href={`/suppliers/${s.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 transition hover:border-brand/40"
          >
            <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-surface-2">
              {s.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              {s.city && <p className="truncate text-xs text-muted">{s.city}</p>}
            </div>
            {s.day_rate != null && (
              <span className="flex-none text-sm font-semibold text-brand">
                €{s.day_rate} / dag
              </span>
            )}
          </Link>
        ))
      )}
      <Link
        href={`/suppliers?category=${category}`}
        className="text-sm font-medium text-brand hover:underline"
      >
        Bekijk alle {kind}-verhuurbedrijven →
      </Link>
    </div>
  )
}
