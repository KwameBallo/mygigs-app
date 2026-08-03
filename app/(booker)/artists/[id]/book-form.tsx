"use client"

import { useState } from "react"
import Link from "next/link"
import { createBooking } from "./actions"
import { useEquipmentSelection } from "./equipment-selection"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { hhmm, rangeHours, withinWindow } from "@/lib/time"
import { useT } from "@/components/i18n-provider"
import {
  priceBreakdown,
  vatBreakdown,
  formatEuro,
  formatPercent,
  VAT_RATE,
} from "@/lib/utils/pricing"

type BookingType = "prive" | "zakelijk"

function formatHours(h: number, comma: boolean, unit: string) {
  const s = Number.isInteger(h)
    ? String(h)
    : h.toString().replace(".", comma ? "," : ".")
  return `${s} ${unit}`
}

export function BookForm({
  artistId,
  baseGage,
  djVatRegistered,
  isLoggedIn,
  emailConfirmed,
  company,
  availability = [],
}: {
  artistId: string
  baseGage: number
  djVatRegistered: boolean
  isLoggedIn: boolean
  emailConfirmed: boolean
  company?: {
    name: string | null
    vat: string | null
    email: string | null
  }
  availability?: { date: string; start: string | null; end: string | null }[]
}) {
  const { locale, t } = useT()
  const b = t.booking
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const fmtHours = (h: number) => formatHours(h, locale === "nl", b.hoursUnit)
  const [type, setType] = useState<BookingType>("prive")
  // Agenda-gestuurde datumkeuze. Heeft de DJ beschikbare dagen ingesteld, dan
  // mag de boeker alleen daaruit kiezen; anders is de datum vrij.
  const hasAgenda = availability.length > 0
  const availableDates = availability.map((a) => a.date)
  const windowByDate: Record<string, { start: string; end: string }> =
    Object.fromEntries(
      availability.map((a) => [
        a.date,
        { start: hhmm(a.start), end: hhmm(a.end) },
      ]),
    )
  const [date, setDate] = useState("")
  const dateBlocked = hasAgenda && date !== "" && !availableDates.includes(date)
  const dayWindow = date ? windowByDate[date] : undefined

  // Tijdvak i.p.v. een duur: de gage volgt automatisch uit start- en eindtijd.
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const hours = rangeHours(startTime, endTime)
  const timeMissing = !startTime || !endTime
  const timeInvalid = !timeMissing && hours <= 0
  const outsideWindow =
    !timeMissing &&
    !timeInvalid &&
    !!dayWindow?.start &&
    !!dayWindow?.end &&
    !withinWindow(startTime, endTime, dayWindow.start, dayWindow.end)
  const timeBlocked = timeMissing || timeInvalid || outsideWindow

  // Kies je een dag met een tijdvenster, dan vullen we start/eind alvast voor.
  function chooseDate(dt: string) {
    setDate(dt)
    const w = windowByDate[dt]
    setStartTime(w?.start ?? "")
    setEndTime(w?.end ?? "")
  }

  // Geverifieerd event-adres (PDOK). Zonder gekozen adres kan er niet geboekt
  // worden — zo weten we zeker dat het adres bestaat.
  const [addressId, setAddressId] = useState<string | null>(null)
  const cannotSubmit = dateBlocked || !addressId || !date || timeBlocked
  const { selected, equipmentCost } = useEquipmentSelection()
  // Basisgage is een uurtarief; langer draaien schaalt de gage automatisch mee.
  const { gage, equipment, total: grossIncl } = priceBreakdown(
    Math.round(baseGage * hours),
    equipmentCost,
  )
  // Particulier: gage + apparatuur is inclusief 21% btw (btw terugrekenen).
  const { vat: vatIncl } = vatBreakdown(grossIncl)
  // Zakelijk: gage + apparatuur exclusief btw. Alleen bij een btw-plichtige DJ
  // komt 21% erbovenop; is de DJ KOR, dan geen btw.
  const netZak = gage + equipment
  const vatZak = djVatRegistered
    ? Math.round(netZak * VAT_RATE * 100) / 100
    : 0
  const grossZak = netZak + vatZak

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">{b.loginToBook}</p>
        <Link
          href={`/login?next=/artists/${artistId}`}
          className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
        >
          {b.loginButton}
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
          {b.confirmEmailTitle}
        </h2>
        <p className="mt-2 text-sm text-muted">{b.confirmEmailBody}</p>
        <p className="mt-3 text-xs text-muted">{b.confirmEmailSpam}</p>
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
      <h2 className="text-lg font-semibold tracking-tight">{b.title}</h2>

      {/* Privé of zakelijk */}
      <div>
        <span className="text-sm font-medium">{b.typeLabel}</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <TypeOption
            value="prive"
            title={b.typePrivateTitle}
            desc={b.typePrivateDesc}
            active={type === "prive"}
            onSelect={setType}
          />
          <TypeOption
            value="zakelijk"
            title={b.typeBusinessTitle}
            desc={b.typeBusinessDesc}
            active={type === "zakelijk"}
            onSelect={setType}
          />
        </div>
      </div>
      <input type="hidden" name="booking_type" value={type} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{b.occasionLabel}</span>
        <input
          name="occasion"
          type="text"
          placeholder={
            type === "zakelijk"
              ? b.occasionPlaceholderBusiness
              : b.occasionPlaceholderPrivate
          }
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{b.dateLabel}</span>
        <input
          name="event_date"
          type="date"
          required
          value={date}
          onChange={(e) => chooseDate(e.currentTarget.value)}
          className="input"
        />
        {hasAgenda && (
          <>
            <span className="text-xs text-muted">{b.availabilityNote}</span>
            <div className="flex flex-wrap gap-1.5">
              {availableDates.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => chooseDate(dt)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    date === dt
                      ? "border-brand bg-brand/20 text-brand"
                      : "border-border text-muted hover:border-brand/50 hover:text-foreground"
                  }`}
                >
                  {new Date(dt).toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "short",
                  })}
                </button>
              ))}
            </div>
          </>
        )}
        {dateBlocked && (
          <span className="text-xs text-red-400">{b.dateUnavailable}</span>
        )}
        {date && !dateBlocked && (
          <span className="text-xs text-muted">
            {dayWindow?.start && dayWindow?.end
              ? b.availableWindow
                  .replace("{from}", dayWindow.start)
                  .replace("{to}", dayWindow.end)
              : b.availableAllDay}
          </span>
        )}
      </label>
      <AddressAutocomplete onSelect={setAddressId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{b.venueLabel}</span>
        <input
          name="venue_name"
          type="text"
          placeholder={b.venuePlaceholder}
          className="input"
        />
      </label>

      {/* Tijdvak — de gage volgt automatisch uit start- en eindtijd. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{b.timeLabel}</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{b.startTimeLabel}</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{b.endTimeLabel}</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.currentTarget.value)}
              className="input"
            />
          </label>
        </div>
        {!timeBlocked && hours > 0 && (
          <span className="text-xs text-muted">
            {b.durationComputed.replace("{h}", fmtHours(hours))} ·{" "}
            {b.hourlyNote.replace("{rate}", formatEuro(baseGage))}
          </span>
        )}
        {timeInvalid && (
          <span className="text-xs text-red-400">{b.timeInvalid}</span>
        )}
        {outsideWindow && (
          <span className="text-xs text-red-400">{b.timeOutsideWindow}</span>
        )}
      </div>
      <input type="hidden" name="start_time" value={startTime} />
      <input type="hidden" name="end_time" value={endTime} />
      <input type="hidden" name="hours" value={hours} />

      {/* Zakelijke factuurgegevens */}
      {type === "zakelijk" && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium">{b.invoiceTitle}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{b.companyLabel}</span>
            <input
              name="company_name"
              type="text"
              defaultValue={company?.name ?? ""}
              placeholder={b.companyPlaceholder}
              className="input h-10"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{b.vatLabel}</span>
              <input
                name="vat_number"
                type="text"
                defaultValue={company?.vat ?? ""}
                placeholder="NL000000000B00"
                className="input h-10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{b.invoiceEmailLabel}</span>
              <input
                name="invoice_email"
                type="email"
                defaultValue={company?.email ?? ""}
                placeholder={b.invoiceEmailPlaceholder}
                className="input h-10"
              />
            </label>
          </div>
          {(company?.name || company?.vat || company?.email) && (
            <p className="text-xs text-muted">
              {b.prefilledPre}
              <Link href="/settings" className="text-brand hover:underline">
                {b.prefilledLink}
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{b.messageLabel}</span>
        <textarea
          name="message"
          rows={3}
          placeholder={b.messagePlaceholder}
          className="input resize-none"
        />
      </label>

      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
        {type === "zakelijk" ? (
          djVatRegistered ? (
            <>
              <Row
                label={`${b.gage} · ${fmtHours(hours)} ${b.gageExcl}`}
                value={formatEuro(gage)}
              />
              {equipment > 0 && (
                <Row label={b.equipmentExcl} value={formatEuro(equipment)} />
              )}
              <div className="my-2 border-t border-border" />
              <Row label={b.subtotalExcl} value={formatEuro(netZak)} strong />
              <Row
                label={`${b.vatRow} (${formatPercent(VAT_RATE)})`}
                value={formatEuro(vatZak)}
              />
              <Row label={b.totalIncl} value={formatEuro(grossZak)} />
              <p className="mt-2 text-xs text-muted">{b.businessNote}</p>
            </>
          ) : (
            <>
              <Row
                label={`${b.gage} · ${fmtHours(hours)}`}
                value={formatEuro(gage)}
              />
              {equipment > 0 && (
                <Row label={b.equipmentRent} value={formatEuro(equipment)} />
              )}
              <div className="my-2 border-t border-border" />
              <Row label={b.totalLabel} value={formatEuro(grossZak)} strong />
              <p className="mt-2 text-xs text-muted">{b.korNote}</p>
            </>
          )
        ) : (
          <>
            <Row
              label={`${b.gage} · ${fmtHours(hours)}`}
              value={formatEuro(gage)}
            />
            {equipment > 0 && (
              <Row label={b.equipmentRent} value={formatEuro(equipment)} />
            )}
            <div className="my-2 border-t border-border" />
            <Row label={b.youPayIncl} value={formatEuro(grossIncl)} strong />
            <Row
              label={`${b.ofWhichVat} (${formatPercent(VAT_RATE)})`}
              value={formatEuro(vatIncl)}
            />
            <p className="mt-2 text-xs text-muted">{b.privateNote}</p>
          </>
        )}
        {equipment > 0 && (
          <p className="mt-2 text-xs text-muted">{b.equipmentNote}</p>
        )}
        <p className="mt-2 text-xs text-muted">{b.payAfterAccept}</p>
      </div>

      {!addressId && (
        <span className="text-xs text-muted">{b.addressRequired}</span>
      )}
      <button
        type="submit"
        disabled={cannotSubmit}
        className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        {b.submit}
      </button>
      <p className="text-center text-xs text-muted">{b.escrowNote}</p>
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
