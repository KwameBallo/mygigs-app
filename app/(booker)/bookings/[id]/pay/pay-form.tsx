"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { payBooking } from "../../actions"
import { formatEuro } from "@/lib/utils/pricing"

type Method = "ideal" | "card"

// De Nederlandse iDEAL-banken. Puur voor de betaalbeleving; de simulatie doet
// er nog niets mee, straks stuurt Stripe de klant door naar de juiste bank.
const IDEAL_BANKS = [
  "ABN AMRO",
  "ASN Bank",
  "bunq",
  "ING",
  "Knab",
  "Rabobank",
  "RegioBank",
  "Revolut",
  "SNS",
  "Triodos Bank",
  "Van Lanschot",
]

export function PayForm({
  bookingId,
  total,
}: {
  bookingId: string
  total: number
}) {
  const [method, setMethod] = useState<Method>("ideal")

  return (
    <form
      action={payBooking}
      className="rounded-2xl border border-border bg-surface p-6"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="payment_method" value={method} />

      <h2 className="text-lg font-semibold tracking-tight">
        Kies je betaalmethode
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MethodOption
          value="ideal"
          title="iDEAL"
          desc="Betaal via je eigen bank"
          active={method === "ideal"}
          onSelect={setMethod}
        />
        <MethodOption
          value="card"
          title="Creditcard"
          desc="Visa, Mastercard"
          active={method === "card"}
          onSelect={setMethod}
        />
      </div>

      {method === "ideal" && (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">Kies je bank</span>
          <select name="ideal_bank" defaultValue="" className="input">
            <option value="" disabled>
              Selecteer je bank…
            </option>
            {IDEAL_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      )}

      {method === "card" && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
          Na bevestiging ga je naar de beveiligde betaalpagina om je
          kaartgegevens in te voeren. Voer je kaartnummer nooit ergens anders in.
        </div>
      )}

      <SubmitButton total={total} />

      <p className="mt-3 text-center text-xs text-muted">
        Beveiligde betaling · geen contant · je gegevens worden niet gedeeld met
        de DJ.
      </p>
    </form>
  )
}

function MethodOption({
  value,
  title,
  desc,
  active,
  onSelect,
}: {
  value: Method
  title: string
  desc: string
  active: boolean
  onSelect: (v: Method) => void
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

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Bezig met betalen…" : `Betaal ${formatEuro(total)}`}
    </button>
  )
}
