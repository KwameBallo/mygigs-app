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
  VAT_RATE,
} from "@/lib/utils/pricing"

type BookingType = "prive" | "zakelijk"

// Boekingsduur in halve uren, van 1 tot 8 uur.
const HOURS_OPTIONS = Array.from({ length: 15 }, (_, i) => 1 + i * 0.5)

function formatHours(h: number) {
  const label = Number.isInteger(h) ? String(h) : h.toString().replace(".", ",")
  return `${label} uur`
}

export function BookForm({
  artistId,
  baseGage,
  isLoggedIn,
  emailConfirmed,
  company,
}: {
  artistId: string
  baseGage: number
  isLoggedIn: boolean
  emailConfirmed: boolean
  company?: {
    name: string | null
    vat: string | null
    email: string | null
  }
}) {
  const [type, setType] = useState<BookingType>("prive")
  const [hours, setHours] = useState(2)
  const { selected, equipmentCost } = useEquipmentSelection()
  // Basisgage is een uurtarief; langer draaien schaalt de gage automatisch mee.
  const { gage, equipment, total: grossIncl } = priceBreakdown(
    Math.round(baseGage * hours),
    equipmentCost,
  )
  // Particulier: gage + apparatuur is inclusief 21% btw (btw terugrekenen).
  const { vat: vatIncl } = vatBreakdown(grossIncl)
  // Zakelijk: gage + apparatuur zijn exclusief btw; 21% komt er bovenop.
  const netZak = gage + equipment
  const vatZak = Math.round(netZak * VAT_RATE * 100) / 100
  const grossZak = netZak + vatZak

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

  // Boeken kan pas nadat het e-mailadres is bevestigd (voorkomt nep-accounts
  // en geeft de DJ zekerheid dat de aanvraag echt is).
  if (!emailConfirmed) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Bevestig eerst je e-mailadres
        </h2>
        <p className="mt-2 text-sm text-muted">
          We hebben je een bevestigingsmail gestuurd. Klik op de link in die
          mail om je account te activeren — daarna kun je deze DJ boeken. Zo
          weet de DJ zeker dat elke aanvraag echt is.
        </p>
        <p className="mt-3 text-xs text-muted">
          Geen mail ontvangen? Check je spam, of log opnieuw in om een nieuwe
          bevestigingsmail te ontvangen.
        </p>
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

      {/* Duur — bepaalt de gage via het uurtarief. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Hoe lang draait de DJ?</span>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="input"
        >
          {HOURS_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {formatHours(h)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          Tarief is per uur ({formatEuro(baseGage)}/uur). Langer draaien = hogere
          gage.
        </span>
      </label>
      <input type="hidden" name="hours" value={hours} />

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
        {type === "zakelijk" ? (
          <>
            <Row
              label={`Gage · ${formatHours(hours)} (excl. btw)`}
              value={formatEuro(gage)}
            />
            {equipment > 0 && (
              <Row
                label="Apparatuur (excl. btw)"
                value={formatEuro(equipment)}
              />
            )}
            <div className="my-2 border-t border-border" />
            <Row
              label="Subtotaal (excl. btw)"
              value={formatEuro(netZak)}
              strong
            />
            <Row
              label={`Btw (${formatPercent(VAT_RATE)})`}
              value={formatEuro(vatZak)}
            />
            <Row label="Totaal (incl. btw)" value={formatEuro(grossZak)} />
            <p className="mt-2 text-xs text-muted">
              Zakelijk: prijzen zijn exclusief btw; de btw staat apart op de
              factuur en vorder je terug.
            </p>
          </>
        ) : (
          <>
            <Row label={`Gage · ${formatHours(hours)}`} value={formatEuro(gage)} />
            {equipment > 0 && (
              <Row
                label="Apparatuur (huur van DJ)"
                value={formatEuro(equipment)}
              />
            )}
            <div className="my-2 border-t border-border" />
            <Row
              label="Jij betaalt (incl. btw)"
              value={formatEuro(grossIncl)}
              strong
            />
            <Row
              label={`waarvan btw (${formatPercent(VAT_RATE)})`}
              value={formatEuro(vatIncl)}
            />
            <p className="mt-2 text-xs text-muted">
              Particulier: dit is de totaalprijs, inclusief btw.
            </p>
          </>
        )}
        {equipment > 0 && (
          <p className="mt-2 text-xs text-muted">
            De DJ neemt eigen geluid/licht mee — apparatuurkosten inbegrepen.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">Je betaalt pas na acceptatie.</p>
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
