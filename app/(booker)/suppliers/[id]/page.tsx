import Link from "next/link"
import { notFound } from "next/navigation"
import { getI18n } from "@/lib/i18n"
import { formatEuro } from "@/lib/utils/pricing"
import { getSupplier, categoryLabel } from "@/lib/data/suppliers"
import { dict } from "../i18n"

export default async function SupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { locale } = await getI18n()
  const d = dict[locale]
  const supplier = await getSupplier(id)
  if (!supplier) notFound()

  const initials = supplier.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <Link
        href="/suppliers"
        className="text-sm text-muted hover:text-foreground"
      >
        {d.backToEquipment}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="relative aspect-[16/9] bg-surface-2">
            {supplier.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={supplier.image_url}
                alt={supplier.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-muted">
                {initials}
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {supplier.name}
              </h1>
              <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-black">
                {categoryLabel(supplier.category, locale)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
              {supplier.reviews_count > 0 && (
                <span>
                  ★ {supplier.rating.toFixed(1)} ({supplier.reviews_count}{" "}
                  {d.reviews})
                </span>
              )}
              {supplier.city && <span>{supplier.city}</span>}
            </div>
            {supplier.description && (
              <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">
                {supplier.description}
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-surface p-6">
            {supplier.day_rate != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {formatEuro(supplier.day_rate)}
                </span>
                <span className="text-sm text-muted">{d.perDaySpaced}</span>
              </div>
            )}

            <h2 className="mt-4 text-sm font-semibold">{d.contact}</h2>
            <div className="mt-2 flex flex-col gap-2">
              {supplier.contact_email && (
                <a
                  href={`mailto:${supplier.contact_email}?subject=${encodeURIComponent(
                    d.requestSubject.replace("{name}", supplier.name),
                  )}`}
                  className="rounded-full bg-brand px-6 py-2.5 text-center font-medium text-black transition hover:bg-brand-strong"
                >
                  {d.sendRequest}
                </a>
              )}
              {supplier.contact_phone && (
                <a
                  href={`tel:${supplier.contact_phone}`}
                  className="rounded-full border border-border px-6 py-2.5 text-center text-sm transition hover:border-brand/50"
                >
                  {supplier.contact_phone}
                </a>
              )}
              {supplier.website_url && (
                <a
                  href={supplier.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border px-6 py-2.5 text-center text-sm transition hover:border-brand/50"
                >
                  {d.website}
                </a>
              )}
              {!supplier.contact_email &&
                !supplier.contact_phone &&
                !supplier.website_url && (
                  <p className="text-sm text-muted">{d.noContactDetails}</p>
                )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
