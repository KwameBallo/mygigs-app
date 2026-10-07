"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { payBooking } from "../../actions"
import { useT } from "@/components/i18n-provider"
import { formatEuro } from "@/lib/utils/pricing"

type Method = "ideal" | "card"

// =============================================================
// De keuze tussen iDEAL en kaart, en verder niets.
//
// De lijst met Nederlandse banken die hier stond is weg. Die was voor de
// simulatie en deed niets; erger nog, hij zou nu verouderen zodra er een bank
// bijkomt of verdwijnt. Mollie toont zijn eigen banklijst en houdt die bij.
//
// De klant kiest hier alleen nog de soort betaling, zodat hij weet waar hij
// aan toe is voordat hij de site verlaat.
// =============================================================

export function PayForm({
  bookingId,
  total,
  fout,
}: {
  bookingId: string
  total: number
  fout?: string
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

      <p className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
        {method === "ideal"
          ? "Je kiest je bank op de volgende pagina, bij onze betaalpartner."
          : "Je vult je kaartgegevens in op de volgende pagina, bij onze betaalpartner. MyGigs ziet je kaartnummer niet."}
      </p>

      {fout && <Foutmelding soort={fout} />}

      <SubmitButton total={total} />

      <p className="mt-3 text-center text-xs text-muted">{p.secureNote}</p>
    </form>
  )
}

// Wat er mis kan gaan voordat de klant ook maar bij Mollie is. Bewust in
// gewone taal: "provider" of "502" zegt een boeker niets.
function Foutmelding({ soort }: { soort: string }) {
  const tekst =
    soort === "provider"
      ? "Het lukte niet om de betaling te starten. Probeer het zo nog eens; er is niets afgeschreven."
      : soort === "nietingesteld"
        ? "Betalen kan op dit moment niet. We zijn ervan op de hoogte."
        : soort === "opslaan"
          ? "Er ging iets mis bij het vastleggen van je betaling. Probeer het opnieuw; er is niets afgeschreven."
          : "Er ging iets mis. Probeer het opnieuw."

  return (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      {tekst}
    </p>
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
