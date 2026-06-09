"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { createShortlist } from "./actions"
import { formatEuro } from "@/lib/utils/pricing"
import type { Artist } from "@/lib/data/artists"

type BookingType = "prive" | "zakelijk"

export function ShortlistClient({
  artists,
  preselected,
  company,
}: {
  artists: Artist[]
  preselected: string[]
  company?: { name: string | null; vat: string | null; email: string | null }
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected),
  )
  const [type, setType] = useState<BookingType>("prive")
  const [search, setSearch] = useState("")

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return artists
    return artists.filter(
      (a) =>
        a.stage_name.toLowerCase().includes(q) ||
        (a.home_city ?? "").toLowerCase().includes(q),
    )
  }, [artists, search])

  const selectedArtists = artists.filter((a) => selected.has(a.id))
  const totalGage = selectedArtists.reduce((sum, a) => sum + a.base_gage, 0)

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Acts kiezen */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          1. Kies je DJ&apos;s
        </h2>
        <p className="mt-1 text-sm text-muted">
          Selecteer meerdere DJ&apos;s. Iedereen krijgt dezelfde aanvraag.
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam of stad..."
          className="input mt-4 h-11 w-full"
        />
        <ul className="mt-4 flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
          {filtered.map((a) => {
            const active = selected.has(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-brand bg-brand/5"
                      : "border-border bg-surface hover:border-brand/40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border ${
                      active
                        ? "border-brand bg-brand text-black"
                        : "border-border"
                    }`}
                  >
                    {active && (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="m5 12 5 5 9-9" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.stage_name}</p>
                    <p className="truncate text-xs text-muted">
                      {a.home_city ?? "DJ"}
                    </p>
                  </div>
                  <span className="flex-none text-sm font-semibold text-brand">
                    {formatEuro(a.base_gage)}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
              Geen DJ&apos;s gevonden.
            </li>
          )}
        </ul>
      </section>

      {/* Aanvraag */}
      <form
        action={createShortlist}
        className="flex flex-col gap-4 self-start rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24"
      >
        <h2 className="text-lg font-semibold tracking-tight">
          2. Vul je aanvraag in
        </h2>

        {[...selected].map((id) => (
          <input key={id} type="hidden" name="artist_ids" value={id} />
        ))}

        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          {selectedArtists.length === 0 ? (
            <p className="text-muted">Nog geen acts geselecteerd.</p>
          ) : (
            <>
              <p className="font-medium">
                {selectedArtists.length} DJ
                {selectedArtists.length === 1 ? "" : "'s"} geselecteerd
              </p>
              <p className="mt-1 text-xs text-muted">
                Totale gage als iedereen accepteert: {formatEuro(totalGage)}. Je
                betaalt alleen de DJ&apos;s die je daadwerkelijk boekt.
              </p>
            </>
          )}
        </div>

        <div>
          <span className="text-sm font-medium">Type boeking</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <TypeOption
              value="prive"
              title="Privé"
              active={type === "prive"}
              onSelect={setType}
            />
            <TypeOption
              value="zakelijk"
              title="Zakelijk"
              active={type === "zakelijk"}
              onSelect={setType}
            />
          </div>
        </div>
        <input type="hidden" name="booking_type" value={type} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Gelegenheid</span>
          <input name="occasion" type="text" placeholder="Bijv. bedrijfsfeest" className="input h-10" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Datum</span>
          <input name="event_date" type="date" required className="input h-10" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Stad</span>
          <input name="city" type="text" placeholder="Amsterdam" className="input h-10" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Locatie / venue</span>
          <input name="venue_name" type="text" placeholder="Naam van de zaal" className="input h-10" />
        </label>

        {type === "zakelijk" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium">Factuurgegevens</p>
            <input
              name="company_name"
              type="text"
              defaultValue={company?.name ?? ""}
              placeholder="Bedrijfsnaam"
              className="input h-10"
            />
            <input
              name="vat_number"
              type="text"
              defaultValue={company?.vat ?? ""}
              placeholder="BTW-nummer"
              className="input h-10"
            />
            <input
              name="invoice_email"
              type="email"
              defaultValue={company?.email ?? ""}
              placeholder="Factuur-e-mail"
              className="input h-10"
            />
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Bericht (optioneel)</span>
          <textarea
            name="message"
            rows={3}
            placeholder="Vertel over je event..."
            className="input resize-none"
          />
        </label>

        <button
          type="submit"
          disabled={selected.size === 0}
          className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Stuur naar {selected.size || ""} DJ
          {selected.size === 1 ? "" : "'s"}
        </button>
        <p className="text-center text-xs text-muted">
          Elke DJ ontvangt een losse aanvraag. Je kiest later wie je definitief
          boekt.{" "}
          <Link href="/discover" className="text-brand hover:underline">
            Of zoek verder
          </Link>
          .
        </p>
      </form>
    </div>
  )
}

function TypeOption({
  value,
  title,
  active,
  onSelect,
}: {
  value: BookingType
  title: string
  active: boolean
  onSelect: (v: BookingType) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-xl border p-2.5 text-center text-sm font-medium transition ${
        active
          ? "border-brand bg-brand/10"
          : "border-border bg-surface-2 hover:border-brand/40"
      }`}
    >
      {title}
    </button>
  )
}
