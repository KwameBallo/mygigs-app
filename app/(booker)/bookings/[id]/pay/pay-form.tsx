"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { payBooking } from "../../actions"
import { useT } from "@/components/i18n-provider"
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
  const { t } = useT()
  const p = t.pay
  const [method, setMethod] = useState<Method>("ideal")

  return (
    <form
      action={payBooking}
      className="rounded-2xl border border-border bg-surface p-6"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="payment_method" value={method} />

      <h2 className="text-lg font-semibold tracking-tight">{p.chooseMethod}</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MethodOption
          value="ideal"
          title="iDEAL"
          desc={p.idealDesc}
          active={method === "ideal"}
          onSelect={setMethod}
        />
        <MethodOption
          value="card"
          title={p.cardTitle}
          desc={p.cardDesc}
          active={method === "card"}
          onSelect={setMethod}
        />
      </div>

      {method === "ideal" && (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">{p.chooseBank}</span>
          <select name="ideal_bank" defaultValue="" className="input">
            <option value="" disabled>
              {p.selectBank}
            </option>
            {IDEAL_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </label>
      )}

      {method === "card" && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
          {p.cardNote}
        </div>
      )}

      <SubmitButton total={total} />

      <p className="mt-3 text-center text-xs text-muted">{p.secureNote}</p>
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
  const { t } = useT()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? t.pay.paying
        : t.pay.payButton.replace("{total}", formatEuro(total))}
    </button>
  )
}
