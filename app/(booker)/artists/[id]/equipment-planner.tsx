"use client"

import { useState } from "react"
import Link from "next/link"

export type MiniSupplier = {
  id: string
  name: string
  city: string | null
  day_rate: number | null
  image_url: string | null
}

type Choice = null | "self" | "rent"

export function EquipmentPlanner({
  hasSound,
  hasLight,
  equipmentItems,
  equipmentPrices,
  equipmentText,
  soundSuppliers,
  lightSuppliers,
}: {
  hasSound: boolean
  hasLight: boolean
  equipmentItems: string[]
  equipmentPrices: Record<string, number>
  equipmentText: string | null
  soundSuppliers: MiniSupplier[]
  lightSuppliers: MiniSupplier[]
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Apparatuur</h3>

      {/* Wat de DJ meebrengt */}
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge on={hasSound} label="Geluid" />
        <Badge on={hasLight} label="Licht" />
      </div>

      {/* Verhuurbare items van de DJ, met huurprijs */}
      {equipmentItems.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {equipmentItems.map((item) => {
            const price = equipmentPrices[item]
            return (
              <li
                key={item}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-sm"
              >
                <span>{item}</span>
                {price != null && price > 0 ? (
                  <span className="font-semibold text-brand">
                    € {price} huur
                  </span>
                ) : (
                  <span className="text-xs text-muted">inbegrepen</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {equipmentText && (
        <p className="mt-2 text-sm text-muted">{equipmentText}</p>
      )}

      {/* Verhuur aanbieden voor wat de DJ niet meebrengt */}
      {!hasSound && (
        <RentBlock
          kind="geluid"
          category="sound"
          suppliers={soundSuppliers}
        />
      )}
      {!hasLight && (
        <RentBlock kind="licht" category="light" suppliers={lightSuppliers} />
      )}
    </div>
  )
}

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        on
          ? "bg-green-500/15 text-green-400"
          : "border border-border text-muted"
      }`}
    >
      {on ? "✓" : "✕"} {on ? `Brengt ${label.toLowerCase()} mee` : `Geen ${label.toLowerCase()}`}
    </span>
  )
}

function RentBlock({
  kind,
  category,
  suppliers,
}: {
  kind: string
  category: "sound" | "light"
  suppliers: MiniSupplier[]
}) {
  const [choice, setChoice] = useState<Choice>(null)

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface-2/50 p-4">
      <p className="text-sm">
        Deze DJ brengt <span className="font-medium">geen {kind}</span> mee.
        Heb je zelf {kind}?
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setChoice("self")}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            choice === "self"
              ? "border-brand bg-brand/10 text-brand"
              : "border-border text-muted hover:border-brand/50"
          }`}
        >
          Ja, regel ik zelf
        </button>
        <button
          type="button"
          onClick={() => setChoice("rent")}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            choice === "rent"
              ? "border-brand bg-brand/10 text-brand"
              : "border-border text-muted hover:border-brand/50"
          }`}
        >
          Nee, ik wil {kind} huren
        </button>
      </div>

      {choice === "self" && (
        <p className="mt-2 text-xs text-muted">Top — dan is alles geregeld. 👍</p>
      )}

      {choice === "rent" && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted">
            Verhuurpartijen voor {kind} via MyGigs:
          </p>
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted">
              Nog geen {kind}-verhuurders in de lijst.
            </p>
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
                    <img
                      src={s.image_url}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  {s.city && (
                    <p className="truncate text-xs text-muted">{s.city}</p>
                  )}
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
            Bekijk alle {kind}-verhuurders →
          </Link>
        </div>
      )}
    </div>
  )
}
