"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { formatEuro } from "@/lib/utils/pricing"
import { SUPPLIER_CATEGORIES, categoryLabel } from "@/lib/data/suppliers-meta"
import type { Supplier } from "@/lib/data/suppliers"

const SuppliersMap = dynamic(
  () => import("./suppliers-map").then((m) => m.SuppliersMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 text-sm text-muted">
        Kaart laden…
      </div>
    ),
  },
)

export function SuppliersClient({
  suppliers,
  filters,
  ad,
}: {
  suppliers: Supplier[]
  filters: { q?: string; category?: string; city?: string }
  ad?: React.ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "map">("list")

  return (
    <div className="flex h-full flex-col">
      {/* Header + filter bar */}
      <div className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold tracking-tight">Apparatuur</h1>
          <p className="mt-1 text-sm text-muted">
            Geen eigen geluid of licht? Vind leveranciers en filter op type.
          </p>

          {/* Type chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <CategoryChip
              label="Alles"
              href="/suppliers"
              active={!filters.category}
            />
            {SUPPLIER_CATEGORIES.map((c) => {
              const params = new URLSearchParams()
              params.set("category", c.value)
              if (filters.q) params.set("q", filters.q)
              if (filters.city) params.set("city", filters.city)
              return (
                <CategoryChip
                  key={c.value}
                  label={c.label}
                  href={`/suppliers?${params.toString()}`}
                  active={filters.category === c.value}
                />
              )
            })}
          </div>

          {/* Search form */}
          <form
            method="get"
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            {filters.category && (
              <input type="hidden" name="category" value={filters.category} />
            )}
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Zoek op naam..."
              className="input h-10 flex-1 sm:max-w-xs"
            />
            <input
              name="city"
              defaultValue={filters.city}
              placeholder="Stad"
              className="input h-10 sm:max-w-[10rem]"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
            >
              Zoek
            </button>
          </form>

          {ad && <div className="mt-3">{ad}</div>}
        </div>
      </div>

      {/* Split view */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* List */}
        <div
          className={`${
            view === "map" ? "hidden" : "flex"
          } w-full flex-col overflow-y-auto lg:flex lg:w-[440px] lg:flex-none lg:border-r lg:border-border`}
        >
          <div className="px-4 py-3 text-sm text-muted">
            {suppliers.length}{" "}
            {suppliers.length === 1 ? "leverancier" : "leveranciers"}
          </div>
          {suppliers.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-medium">Geen leveranciers gevonden</p>
              <Link
                href="/suppliers"
                className="mt-2 inline-block text-sm text-brand"
              >
                Wis filters
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 px-3 pb-6">
              {suppliers.map((s) => (
                <ListCard
                  key={s.id}
                  supplier={s}
                  active={s.id === activeId}
                  onHover={() => setActiveId(s.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Map */}
        <div
          className={`${view === "list" ? "hidden" : "block"} flex-1 lg:block`}
        >
          <SuppliersMap
            suppliers={suppliers}
            activeId={activeId}
            onActivate={setActiveId}
          />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setView(view === "list" ? "map" : "list")}
          className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-brand px-6 py-3 font-medium text-black shadow-lg transition hover:bg-brand-strong lg:hidden"
        >
          {view === "list" ? "Kaart" : "Lijst"}
        </button>
      </div>
    </div>
  )
}

function CategoryChip({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-brand bg-brand text-black"
          : "border-border bg-surface-2 text-muted hover:border-brand/50 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  )
}

function ListCard({
  supplier,
  active,
  onHover,
}: {
  supplier: Supplier
  active: boolean
  onHover: () => void
}) {
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
        onMouseEnter={onHover}
        className={`flex gap-3 rounded-2xl border p-3 transition ${
          active
            ? "border-brand bg-brand/5"
            : "border-border bg-surface hover:border-brand/40"
        }`}
      >
        <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-surface-2">
          {supplier.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={supplier.image_url}
              alt={supplier.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {initials}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-semibold">{supplier.name}</h3>
          {supplier.city && (
            <p className="truncate text-sm text-muted">{supplier.city}</p>
          )}
          <div className="mt-1">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {categoryLabel(supplier.category)}
            </span>
          </div>
          <div className="mt-auto flex items-center justify-between pt-1">
            {supplier.reviews_count > 0 ? (
              <span className="text-xs text-muted">
                ★ {supplier.rating.toFixed(1)} ({supplier.reviews_count})
              </span>
            ) : (
              <span className="text-xs text-muted">Nieuw</span>
            )}
            {supplier.day_rate != null && (
              <span className="font-semibold text-brand">
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
