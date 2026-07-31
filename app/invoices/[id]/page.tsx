import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { formatEuro, formatPercent } from "@/lib/utils/pricing"
import { PrintButton } from "./print-button"
import { dict } from "./i18n"

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
  if (!user) redirect(`/login?next=/invoices/${id}`)

  // RLS zorgt dat alleen de betrokken DJ of boeker deze factuur kan ophalen.
  const { data: inv } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!inv) notFound()

  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const kindLabel = inv.kind === "dj_sale" ? d.kindSale : d.kindCommission
  const issued = new Date(inv.issued_at).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const hasVat = Number(inv.vat_amount) > 0

  // Uitbetalingsspecificatie: alleen voor de DJ (niet de boeker) op de
  // verkoopfactuur. Toont wat er van het bruto bedrag afgaat aan MyGigs-
  // commissie (7% excl. btw) en wat er netto wordt uitbetaald. Nooit op de
  // print/PDF die naar de klant gaat (print:hidden hieronder).
  const viewerIsDJ = user.id !== inv.booker_id
  let payout: { gross: number; commNet: number; commVat: number; net: number } | null =
    null
  if (inv.kind === "dj_sale" && viewerIsDJ && inv.booking_id) {
    const { data: comm } = await supabase
      .from("invoices")
      .select("net, vat_amount")
      .eq("booking_id", inv.booking_id)
      .eq("kind", "mg_commission")
      .maybeSingle()
    if (comm) {
      const gross = Number(inv.gross)
      const commNet = Number(comm.net)
      payout = {
        gross,
        commNet,
        commVat: Number(comm.vat_amount),
        net: gross - commNet,
      }
    }
  }

  // Factuurregels: het optreden + eventuele bijgeboekte apparatuur. Valt terug
  // op de enkele omschrijving voor oude facturen zonder line_items.
  const lineItems =
    Array.isArray(inv.line_items) && inv.line_items.length > 0
      ? (inv.line_items as { description: string; amount: number }[])
      : [
          {
            description: inv.description,
            amount: hasVat ? Number(inv.net) : Number(inv.gross),
          },
        ]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {d.back}
        </Link>
        <PrintButton label={d.print} />
      </div>

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-8 text-sm text-neutral-800 print:rounded-none print:border-0">
        {/* MyGigs-merkbalk in huisstijl (oranje vlak, zwarte tekst — print-veilig) */}
        <div
          className="mb-8 rounded-2xl bg-brand px-6 py-5 text-black"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
          <div className="text-2xl font-bold tracking-tight">MyGigs.</div>
          <div className="mt-0.5 text-xs font-medium text-black/70">
            {d.brandTagline}
          </div>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              {d.from}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">
              {inv.issuer_name}
            </p>
            {inv.issuer_address && (
              <p className="text-neutral-500">{inv.issuer_address}</p>
            )}
            {inv.issuer_vat && (
              <p className="text-neutral-500">
                {d.vatLabel.replace("{vat}", inv.issuer_vat)}
              </p>
            )}
            {inv.issuer_kvk && (
              <p className="text-neutral-500">
                {d.kvkLabel.replace("{kvk}", inv.issuer_kvk)}
              </p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              {kindLabel}
            </h1>
            <p className="mt-1 text-neutral-500">{inv.number}</p>
            <p className="text-neutral-500">
              {d.date}: {issued}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-neutral-500">{d.to}</p>
          <p className="mt-2 font-medium text-neutral-900">{inv.recipient_name}</p>
          {inv.recipient_address && (
            <p className="text-neutral-500">{inv.recipient_address}</p>
          )}
          {inv.recipient_vat && (
            <p className="text-neutral-500">
              {d.vatLabel.replace("{vat}", inv.recipient_vat)}
            </p>
          )}
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="py-2 font-medium">{d.description}</th>
              <th className="py-2 text-right font-medium">
                {hasVat ? d.amountExcl : d.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-3">{d.equip[li.description] ?? li.description}</td>
                <td className="py-3 text-right align-top tabular-nums">
                  {formatEuro(Number(li.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs">
            {hasVat ? (
              <>
                <Row label={d.subtotal} value={formatEuro(Number(inv.net))} />
                <Row
                  label={d.vat.replace(
                    "{rate}",
                    formatPercent(Number(inv.vat_rate)),
                  )}
                  value={formatEuro(Number(inv.vat_amount))}
                />
                <div
                  className="my-2 border-t-2 border-brand"
                  style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                />
                <Row label={d.total} value={formatEuro(Number(inv.gross))} strong accent />
              </>
            ) : (
              <Row label={d.total} value={formatEuro(Number(inv.gross))} strong accent />
            )}
          </div>
        </div>

        {inv.vat_note && (
          <p className="mt-6 text-xs text-neutral-500">{inv.vat_note}</p>
        )}
        <p className="mt-2 text-xs text-neutral-500">{d.paidViaMyGigs}</p>
      </div>

      {/* Uitbetalingsspecificatie — alleen voor de DJ, nooit op de klant-PDF. */}
      {payout && (
        <div className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-8 text-sm text-neutral-800 print:hidden">
          <h2 className="text-base font-semibold text-brand">{d.payoutTitle}</h2>
          <p className="mt-1 text-xs text-neutral-500">{d.payoutHint}</p>
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-sm">
              <Row label={d.payoutGross} value={formatEuro(payout.gross)} />
              <Row
                label={d.payoutCommission}
                value={`− ${formatEuro(payout.commNet)}`}
              />
              <div className="my-2 border-t border-neutral-200" />
              <Row label={d.payoutNet} value={formatEuro(payout.net)} strong />
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            {d.payoutVatNote.replace("{vat}", formatEuro(payout.commVat))}
          </p>
        </div>
      )}
    </main>
  )
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string
  value: string
  strong?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className={strong ? "font-semibold text-neutral-900" : "text-neutral-500"}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          accent
            ? "font-semibold text-brand"
            : strong
              ? "font-semibold text-neutral-900"
              : "text-neutral-800"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
