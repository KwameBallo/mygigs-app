"use client"

import { useState } from "react"
import Link from "next/link"
import { createBooking } from "./actions"
import { useEquipmentSelection } from "./equipment-selection"
import {
  priceBreakdown,
  vatBreakdown,
  formatEuro,
  formatPercent,
  ARTIST_COMMISSION_RATE,
  VAT_RATE,
} from "@/lib/utils/pricing"

type BookingType = "prive" | "zakelijk"

export function BookForm({
  artistId,
  baseGage,
  isLoggedIn,
  company,
}: {
  artistId: string
  baseGage: number
  isLoggedIn: boolean
  company?: {
    name: string | null
    vat: string | null
    email: string | null
  }
}) {
  const [type, setType] = useState<BookingType>("prive")
  const { selected, equipmentCost } = useEquipmentSelection()
  const { gage, equipment, total: gross } = priceBreakdown(baseGage, equipmentCost)
  // Gage + apparatuur is de consumentprijs inclusief 21% btw; btw terugrekenen.
  const { net, vat } = vatBreakdown(gross)

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">Log in om deze DJ te boeken.</p>
        <Link
          href={`/login?next=/artists/${artistId}`}
          className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
        >
          Inloggen om te boeken
        </Link>
      </div>
    )
  }

  return (
    <form
      action={createBooking}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <input type="hidden" name="artist_id" value={artistId} />
      {/* Gekozen DJ-apparatuur (telt in de prijs). */}
      {[...selected].map((item) => (
        <input key={item} type="hidden" name="dj_equipment" value={item} />
      ))}
      <h2 className="text-lg font-semibold tracking-tight">Boek deze DJ</h2>

      {/* Privé of zakelijk */}
      <div>
        <span className="text-sm font-medium">Type boeking</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <TypeOption
            value="prive"
            title="Privé"
            desc="Bruiloft, verjaardag, feest"
            active={type === "prive"}
            onSelect={setType}
          />
          <TypeOption
            value="zakelijk"
            title="Zakelijk"
            desc="Bedrijfsfeest, congres, opening"
            active={type === "zakelijk"}
            onSelect={setType}
          />
        </div>
      </div>
      <input type="hidden" name="booking_type" value={type} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Gelegenheid</span>
        <input
          name="occasion"
          type="text"
          placeholder={
            type === "zakelijk" ? "Bijv. bedrijfsfeest" : "Bijv. verjaardag"
          }
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Datum</span>
        <input name="event_date" type="date" required className="input" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Stad</span>
        <input
          name="city"
          type="text"
          placeholder="Amsterdam"
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Locatie / venue</span>
        <input
          name="venue_name"
          type="text"
          placeholder="Naam van de zaal"
          className="input"
        />
      </label>

      {/* Zakelijke factuurgegevens */}
      {type === "zakelijk" && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium">Factuurgegevens</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Bedrijfsnaam</span>
            <input
              name="company_name"
              type="text"
              defaultValue={company?.name ?? ""}
              placeholder="Bedrijf B.V."
              className="input h-10"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">BTW-nummer</span>
              <input
                name="vat_number"
                type="text"
                defaultValue={company?.vat ?? ""}
                placeholder="NL000000000B00"
                className="input h-10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Factuur-e-mail</span>
              <input
                name="invoice_email"
                type="email"
                defaultValue={company?.email ?? ""}
                placeholder="factuur@bedrijf.nl"
                className="input h-10"
              />
            </label>
          </div>
          {(company?.name || company?.vat || company?.email) && (
            <p className="text-xs text-muted">
              Vooraf ingevuld vanuit je{" "}
              <Link href="/settings" className="text-brand hover:underline">
                bedrijfsgegevens
              </Link>
              .
            </p>
          )}
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

      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
        <Row label="Gage" value={formatEuro(gage)} />
        {equipment > 0 && (
          <Row label="Apparatuur (huur van DJ)" value={formatEuro(equipment)} />
        )}
        <div className="my-2 border-t border-border" />
        <Row
          label={type === "zakelijk" ? "Totaal (incl. btw)" : "Jij betaalt (incl. btw)"}
          value={formatEuro(gross)}
          strong
        />
        <Row
          label={`waarvan btw (${formatPercent(VAT_RATE)})`}
          value={formatEuro(vat)}
        />
        {type === "zakelijk" ? (
          <p className="mt-2 rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
            Excl. btw: {formatEuro(net)}. Als bedrijf vorder je{" "}
            {formatEuro(vat)} btw terug → netto {formatEuro(net)}.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Particulier: dit is de totaalprijs, inclusief btw.
          </p>
        )}
        {equipment > 0 && (
          <p className="mt-2 text-xs text-muted">
            Incl. {formatEuro(equipment)} apparatuurkosten — deze DJ neemt eigen
            geluid/licht mee.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          MyGigs rekent {formatPercent(ARTIST_COMMISSION_RATE)} commissie bij de
          DJ. Je betaalt pas na acceptatie.
        </p>
      </div>

      <button
        type="submit"
        className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
      >
        Aanvraag versturen
      </button>
      <p className="text-center text-xs text-muted">
        Je betaalt pas na acceptatie. Geld staat veilig in escrow.
      </p>
    </form>
  )
}

function TypeOption({
  value,
  title,
  desc,
  active,
  onSelect,
}: {
  value: BookingType
  title: string
  desc: string
  active: boolean
  onSelect: (v: BookingType) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-xl border p-3 text-left transition ${
        active
          ? "border-brand bg-brand/10"
          : "border-border bg-surface-2 hover:border-brand/40"
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-muted">{desc}</span>
    </button>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={strong ? "font-medium" : "text-muted"}>{label}</span>
      <span className={strong ? "font-semibold text-brand" : ""}>{value}</span>
    </div>
  )
}
