"use client"

import { useState } from "react"

type G = { id: number; name: string }

export function GenrePicker({
  genres,
  initial,
}: {
  genres: G[]
  initial: number[]
}) {
  const [selected, setSelected] = useState<number[]>(initial)
  const [q, setQ] = useState("")

  const selectedSet = new Set(selected)
  const query = q.trim().toLowerCase()
  const matches = query
    ? genres
        .filter(
          (g) => !selectedSet.has(g.id) && g.name.toLowerCase().includes(query),
        )
        .slice(0, 8)
    : []
  const byId = (id: number) => genres.find((g) => g.id === id)

  function add(id: number) {
    setSelected((s) => (s.includes(id) ? s : [...s, id]))
    setQ("")
  }
  function remove(id: number) {
    setSelected((s) => s.filter((x) => x !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Verborgen velden zodat het formulier de selectie meestuurt */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="genres" value={id} />
      ))}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const g = byId(id)
            if (!g) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-3 py-1 text-sm text-brand"
              >
                {g.name}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={`Verwijder ${g.name}`}
                  className="text-base leading-none text-brand/70 transition hover:text-brand"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek een stijl… (bv. techno, house, afro)"
          className="input h-11 w-full"
        />
        {matches.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl">
            {matches.map((g) => (
              <button
                type="button"
                key={g.id}
                onClick={() => add(g.id)}
                className="flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-surface-2"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <span className="text-xs text-muted">
          Typ om stijlen te zoeken en aan te klikken — kies er zoveel als je wilt.
        </span>
      )}
    </div>
  )
}
