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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← {d.back}
        </Link>
        <PrintButton label={d.print} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-8 text-sm print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-brand print:text-black">
              {inv.issuer_name}
            </p>
            {inv.issuer_address && (
              <p className="mt-1 text-muted">{inv.issuer_address}</p>
            )}
            {inv.issuer_vat && (
              <p className="text-muted">
                {d.vatLabel.replace("{vat}", inv.issuer_vat)}
              </p>
            )}
            {inv.issuer_kvk && (
              <p className="text-muted">
                {d.kvkLabel.replace("{kvk}", inv.issuer_kvk)}
              </p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold tracking-tight">{kindLabel}</h1>
            <p className="mt-1 text-muted">{inv.number}</p>
            <p className="text-muted">
              {d.date}: {issued}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-muted">{d.to}</p>
          <p className="mt-2 font-medium">{inv.recipient_name}</p>
          {inv.recipient_address && (
            <p className="text-muted">{inv.recipient_address}</p>
          )}
          {inv.recipient_vat && (
            <p className="text-muted">
              {d.vatLabel.replace("{vat}", inv.recipient_vat)}
            </p>
          )}
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted print:border-black/20">
              <th className="py-2 font-medium">{d.description}</th>
              <th className="py-2 text-right font-medium">
                {hasVat ? d.amountExcl : d.total}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border print:border-black/10">
              <td className="py-3">{inv.description}</td>
              <td className="py-3 text-right align-top">
                {formatEuro(Number(hasVat ? inv.net : inv.gross))}
              </td>
            </tr>
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
                <div className="my-2 border-t border-border print:border-black/20" />
                <Row label={d.total} value={formatEuro(Number(inv.gross))} strong />
              </>
            ) : (
              <Row label={d.total} value={formatEuro(Number(inv.gross))} strong />
            )}
          </div>
        </div>

        {inv.vat_note && (
          <p className="mt-6 text-xs text-muted">{inv.vat_note}</p>
        )}
        <p className="mt-2 text-xs text-muted">{d.paidViaMyGigs}</p>
        <p className="mt-6 text-xs text-muted">{d.footer}</p>
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
