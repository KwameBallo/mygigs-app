import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro, formatPercent, vatBreakdown, VAT_RATE } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { PayForm } from "./pay-form"

type ArtistLite = {
  stage_name: string
  avatar_url: string | null
  verified: boolean
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/bookings/${id}/pay`)

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, artists(stage_name, avatar_url, verified)")
    .eq("id", id)
    .eq("booker_id", user.id)
    .maybeSingle()

  if (!booking) notFound()
  // Alleen een geaccepteerde boeking is betaalbaar. Al betaald/geannuleerd →
  // terug naar het overzicht.
  if (booking.status !== "accepted") redirect("/bookings")

  const { locale, t } = await getI18n()
  const p = t.pay
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const artist = booking.artists as ArtistLite | null
  const { vat } = vatBreakdown(booking.total)
  const eventDate = new Date(booking.event_date).toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link
        href="/bookings"
        className="text-sm text-muted transition hover:text-foreground"
      >
        {p.back}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-2 text-muted">{p.subtitle}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Betaalmethode + bevestigen */}
        <div className="lg:col-span-3">
          <PayForm bookingId={booking.id} total={booking.total} />

          {/* Vertrouwen / zekerheid voor de klant */}
          <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm font-semibold">{p.whySafe}</p>
            <ul className="mt-3 flex flex-col gap-3">
              <TrustItem title={p.trust1Title}>{p.trust1Body}</TrustItem>
              <TrustItem title={p.trust2Title}>{p.trust2Body}</TrustItem>
              <TrustItem title={p.trust3Title}>{p.trust3Body}</TrustItem>
              <TrustItem title={p.trust4Title}>{p.trust4Body}</TrustItem>
            </ul>
          </div>

          {/* Eerlijk zolang de echte betaalprovider nog niet live is. */}
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            {p.demoNote}
          </p>
        </div>

        {/* Samenvatting van de boeking */}
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-muted">{p.yourBooking}</p>
              <StatusBadge status={booking.status} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {artist?.stage_name ?? "DJ"}
              </h2>
              {artist?.verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-xs text-brand">
                  ✓ {p.verified}
                </span>
              )}
            </div>

            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <SummaryRow label={p.rowType}>
                {booking.booking_type === "zakelijk" ? p.business : p.private}
              </SummaryRow>
              {booking.occasion && (
                <SummaryRow label={p.rowOccasion}>{booking.occasion}</SummaryRow>
              )}
              <SummaryRow label={p.rowDate}>{eventDate}</SummaryRow>
              {booking.city && (
                <SummaryRow label={p.rowCity}>{booking.city}</SummaryRow>
              )}
              {booking.venue_name && (
                <SummaryRow label={p.rowVenue}>{booking.venue_name}</SummaryRow>
              )}
            </dl>

            <div className="my-4 border-t border-border" />

            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>
                  {p.ofWhichVat} ({formatPercent(VAT_RATE)})
                </span>
                <span>{formatEuro(vat)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.toPay}</span>
                <span className="text-lg font-semibold text-brand">
                  {formatEuro(booking.total)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function TrustItem({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand/15 text-xs text-brand">
        ✓
      </span>
      <span className="text-sm">
        <span className="font-medium">{title}</span>
        <span className="block text-muted">{children}</span>
      </span>
    </li>
  )
}

function SummaryRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
