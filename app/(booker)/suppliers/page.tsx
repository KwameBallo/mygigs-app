import Link from "next/link"
import { formatEuro } from "@/lib/utils/pricing"
import {
  getSuppliers,
  categoryLabel,
  SUPPLIER_CATEGORIES,
  type Supplier,
} from "@/lib/data/suppliers"

type SearchParams = Promise<{
  q?: string
  category?: string
  city?: string
}>

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, category, city } = await searchParams
  const suppliers = await getSuppliers({ q, category, city })

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Apparatuur</h1>
      <p className="mt-2 max-w-xl text-muted">
        Geen eigen geluid of licht? Vind leveranciers voor geluid, licht,
        podium, DJ-apparatuur en backline en huur wat je nodig hebt.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op naam..."
          className="input h-10 flex-1 sm:max-w-xs"
        />
        <input
          name="city"
          defaultValue={city}
          placeholder="Stad"
          className="input h-10 sm:max-w-[10rem]"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="input h-10 sm:max-w-[12rem]"
        >
          <option value="">Alle categorieën</option>
          {SUPPLIER_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          Zoek
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {suppliers.length}{" "}
        {suppliers.length === 1 ? "leverancier" : "leveranciers"}
      </p>

      {suppliers.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium">Geen leveranciers gevonden</p>
          <Link
            href="/suppliers"
            className="mt-2 inline-block text-sm text-brand"
          >
            Wis filters
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} />
          ))}
        </ul>
      )}
    </main>
  )
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const initials = supplier.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <li>
      <Link
        href={`/suppliers/${supplier.id}`}
        className="flex h-full flex-col rounded-2xl border border-border bg-surface transition hover:border-brand/40"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-surface-2">
          {supplier.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplier.image_url}
              alt={supplier.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted">
              {initials}
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {categoryLabel(supplier.category)}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="truncate font-semibold">{supplier.name}</h3>
          {supplier.city && (
            <p className="truncate text-sm text-muted">{supplier.city}</p>
          )}
          <div className="mt-auto flex items-center justify-between pt-3">
            {supplier.reviews_count > 0 ? (
              <span className="text-xs text-muted">
                ★ {supplier.rating.toFixed(1)} ({supplier.reviews_count})
              </span>
            ) : (
              <span className="text-xs text-muted">Nieuw</span>
            )}
            {supplier.day_rate != null && (
              <span className="text-sm font-semibold text-brand">
                {formatEuro(supplier.day_rate)}
                <span className="text-xs font-normal text-muted"> /dag</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
