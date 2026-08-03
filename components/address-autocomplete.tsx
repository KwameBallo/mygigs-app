"use client"

import { useEffect, useRef, useState } from "react"
import { useT } from "@/components/i18n-provider"

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1"

type Suggestion = { id: string; label: string }

// Adresveld met autocomplete op PDOK Locatieserver (officiële BAG-data). De
// gebruiker kan alleen een bestaand Nederlands adres kiezen. Het gekozen
// adres-id gaat mee als verborgen veld; de server verifieert het opnieuw.
export function AddressAutocomplete({
  onSelect,
  initialLabel = "",
}: {
  onSelect: (id: string | null) => void
  initialLabel?: string
}) {
  const { t } = useT()
  const b = t.booking
  const [query, setQuery] = useState(initialLabel)
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chosenId, setChosenId] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounce: pas na 250 ms zonder typen zoeken.
  useEffect(() => {
    if (chosenId) return // al iets gekozen; niet opnieuw zoeken
    const q = query.trim()
    if (q.length < 3) {
      setItems([])
      return
    }
    let stop = false
    setLoading(true)
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `${PDOK}/suggest?q=${encodeURIComponent(q)}&fq=type:adres&rows=6`,
          { headers: { Accept: "application/json" } },
        )
        const json = await res.json()
        const docs: Suggestion[] = (json?.response?.docs ?? []).map(
          (d: { id: string; weergavenaam: string }) => ({
            id: d.id,
            label: d.weergavenaam,
          }),
        )
        if (!stop) {
          setItems(docs)
          setOpen(true)
        }
      } catch {
        if (!stop) setItems([])
      } finally {
        if (!stop) setLoading(false)
      }
    }, 250)
    return () => {
      stop = true
      clearTimeout(id)
    }
  }, [query, chosenId])

  // Klik buiten het veld sluit de lijst.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  function pick(s: Suggestion) {
    setQuery(s.label)
    setChosenId(s.id)
    setItems([])
    setOpen(false)
    onSelect(s.id)
  }

  function edit(v: string) {
    setQuery(v)
    if (chosenId) {
      setChosenId(null)
      onSelect(null)
    }
  }

  return (
    <div ref={boxRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm font-medium">{b.addressLabel}</span>
      <input type="hidden" name="address_id" value={chosenId ?? ""} />
      <input
        type="text"
        value={query}
        onChange={(e) => edit(e.currentTarget.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        placeholder={b.addressPlaceholder}
        autoComplete="off"
        className="input"
      />
      {open && (loading || items.length > 0) && (
        <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {loading && items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{b.addressSearching}</li>
          ) : (
            items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="block w-full px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                >
                  {s.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {chosenId ? (
        <span className="flex items-center gap-1.5 text-xs text-brand">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m3 8.5 3.2 3.2L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {b.addressVerified}
        </span>
      ) : (
        <span className="text-xs text-muted">{b.addressPickHint}</span>
      )}
    </div>
  )
}
