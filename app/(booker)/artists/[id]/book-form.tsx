import Link from "next/link"
import { createBooking } from "./actions"
import { priceBreakdown, formatEuro } from "@/lib/utils/pricing"

export function BookForm({
  artistId,
  baseGage,
  isLoggedIn,
}: {
  artistId: string
  baseGage: number
  isLoggedIn: boolean
}) {
  const { gage, total } = priceBreakdown(baseGage)

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          Log in om deze artiest te boeken.
        </p>
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
      <h2 className="text-lg font-semibold tracking-tight">Boek deze artiest</h2>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Datum</span>
        <input name="event_date" type="date" required className="input" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Stad</span>
        <input name="city" type="text" placeholder="Amsterdam" className="input" />
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
        <div className="my-2 border-t border-border" />
        <Row label="Totaal" value={formatEuro(total)} strong />
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
