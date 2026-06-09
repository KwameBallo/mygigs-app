import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatEuro, vatBreakdown, VAT_RATE, formatPercent } from "@/lib/utils/pricing"
import { PrintButton } from "./print-button"

// Factuurnummer: jaar + eerste 8 tekens van de boeking-id (hoofdletters).
function invoiceNumber(id: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear()
  return `MG-${year}-${id.slice(0, 8).toUpperCase()}`
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/bookings/${id}/invoice`)

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, artists(stage_name)")
    .eq("id", id)
    .eq("booker_id", user.id)
    .maybeSingle()

  if (!booking) notFound()

  // Facturen zijn alleen voor zakelijke boekingen.
  if (booking.booking_type !== "zakelijk") {
    redirect("/bookings")
  }

  const artist = booking.artists as { stage_name: string } | null
  const { net, vat, gross } = vatBreakdown(booking.total)
  const number = invoiceNumber(booking.id, booking.created_at)

  const issued = new Date(booking.created_at).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const eventDate = new Date(booking.event_date).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/bookings"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Terug naar boekingen
        </Link>
        <PrintButton />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-8 text-sm print:border-0 print:bg-white print:p-0 print:text-black">
        {/* Kop */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-brand print:text-black">
              MyGigs
            </p>
            <p className="mt-1 text-muted">
              Het boekingsplatform voor artiesten en events.
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold tracking-tight">Factuur</h1>
            <p className="mt-1 text-muted">{number}</p>
            <p className="text-muted">Datum: {issued}</p>
          </div>
        </div>

        {/* Adressen */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Van</p>
            <p className="mt-2 font-medium">MyGigs B.V.</p>
            <p className="text-muted">Amsterdam, Nederland</p>
            <p className="text-muted">BTW: NL000000000B00</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              Factuur aan
            </p>
            <p className="mt-2 font-medium">
              {booking.company_name ?? "Bedrijfsnaam onbekend"}
            </p>
            {booking.vat_number && (
              <p className="text-muted">BTW: {booking.vat_number}</p>
            )}
            {booking.invoice_email && (
              <p className="text-muted">{booking.invoice_email}</p>
            )}
          </div>
        </div>

        {/* Regels */}
        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted print:border-black/20">
              <th className="py-2 font-medium">Omschrijving</th>
              <th className="py-2 text-right font-medium">Bedrag (excl. BTW)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border print:border-black/10">
              <td className="py-3">
                <p className="font-medium">
                  Optreden {artist?.stage_name ?? "artiest"}
                </p>
                <p className="text-muted">
                  {booking.occasion ? `${booking.occasion} · ` : ""}
                  {eventDate}
                  {booking.city ? ` · ${booking.city}` : ""}
                  {booking.venue_name ? ` · ${booking.venue_name}` : ""}
                </p>
              </td>
              <td className="py-3 text-right align-top">{formatEuro(net)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totalen */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs">
            <Row label="Subtotaal" value={formatEuro(net)} />
            <Row
              label={`BTW (${formatPercent(VAT_RATE)})`}
              value={formatEuro(vat)}
            />
            <div className="my-2 border-t border-border print:border-black/20" />
            <Row label="Totaal" value={formatEuro(gross)} strong />
          </div>
        </div>

        <p className="mt-10 text-xs text-muted">
          Betaling verloopt via MyGigs. Het bedrag staat veilig in escrow tot na
          het optreden. Deze factuur is automatisch gegenereerd en geldig zonder
          handtekening.
        </p>
      </div>
    </main>
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
    <div className="flex items-center justify-between py-1">
      <span className={strong ? "font-semibold" : "text-muted"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  )
}
