"use client"

import { useState } from "react"

export type Gig = {
  id: string
  place: string
  city: string | null
  date: string
  status: string
}

type Labels = {
  countMany: string
  countOne: string
  statusPending: string
  statusAccepted: string
  statusPaid: string
  statusCompleted: string
}

const COLOR: Record<string, string> = {
  pending: "#3b82f6",
  accepted: "#f59e0b",
  paid: "#22c55e",
  completed: "#22c55e",
}

// Optredens gegroepeerd per maand, uitklapbaar. Toont alleen locatie + datum —
// geen klantgegevens (AVG). Nieuwste maand staat standaard open.
export function GigMonths({
  gigs,
  dateLocale,
  labels,
}: {
  gigs: Gig[]
  dateLocale: string
  labels: Labels
}) {
  const groups = new Map<string, Gig[]>()
  for (const g of gigs) {
    if (!g.date) continue
    const k = g.date.slice(0, 7)
    const arr = groups.get(k)
    if (arr) arr.push(g)
    else groups.set(k, [g])
  }
  const monthKeys = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1))

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(monthKeys.slice(0, 1)),
  )
  const toggle = (k: string) =>
    setOpen((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const statusLabel = (s: string) =>
    s === "pending"
      ? labels.statusPending
      : s === "accepted"
        ? labels.statusAccepted
        : s === "completed"
          ? labels.statusCompleted
          : labels.statusPaid

  if (monthKeys.length === 0) return null

  return (
    <div className="mt-4 flex flex-col gap-2">
      {monthKeys.map((k) => {
        const items = groups
          .get(k)!
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        const monthLabel = new Date(`${k}-01T00:00:00`).toLocaleDateString(
          dateLocale,
          { month: "long", year: "numeric" },
        )
        const count =
          items.length === 1
            ? labels.countOne
            : labels.countMany.replace("{n}", String(items.length))
        const isOpen = open.has(k)
        return (
          <div
            key={k}
            className="overflow-hidden rounded-xl border border-border bg-surface-2"
          >
            <button
              type="button"
              onClick={() => toggle(k)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-medium capitalize">
                {monthLabel}
                <span className="ml-1.5 font-normal text-muted">· {count}</span>
              </span>
              <span
                className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3">
                {items.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 border-t border-border py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: COLOR[g.status] ?? "#9ca3af" }}
                        title={statusLabel(g.status)}
                      />
                      <span className="truncate">
                        {g.place}
                        {g.city && g.place !== g.city && (
                          <span className="text-muted">, {g.city}</span>
                        )}
                      </span>
                    </span>
                    <span className="flex-none text-muted">
                      {new Date(`${g.date}T00:00:00`).toLocaleDateString(
                        dateLocale,
                        { day: "numeric", month: "short" },
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
