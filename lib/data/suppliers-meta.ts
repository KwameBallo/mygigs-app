// Client-veilige metadata voor leveranciers (geen server-imports).
import type { Enums } from "@/types/database"
import type { Locale } from "@/lib/i18n/config"

export type SupplierCategory = Enums<"supplier_category">

// Canonieke value + label per taal. `value` is de DB-enum en blijft stabiel.
const CATEGORIES: {
  value: SupplierCategory
  nl: string
  en: string
}[] = [
  { value: "sound", nl: "Geluid", en: "Sound" },
  { value: "light", nl: "Licht", en: "Lighting" },
  { value: "stage", nl: "Podium", en: "Stage" },
  { value: "dj_gear", nl: "DJ-apparatuur", en: "DJ gear" },
  { value: "backline", nl: "Backline", en: "Backline" },
  { value: "other", nl: "Overig", en: "Other" },
]

// Lijst met gelokaliseerd label voor dropdowns/chips.
export function supplierCategories(
  locale: Locale = "nl",
): { value: SupplierCategory; label: string }[] {
  return CATEGORIES.map((c) => ({ value: c.value, label: c[locale] }))
}

// Backward-compat: sommige callers verwachten nog de NL-lijst.
export const SUPPLIER_CATEGORIES = supplierCategories("nl")

export function categoryLabel(
  value: string | null,
  locale: Locale = "nl",
): string {
  const c = CATEGORIES.find((x) => x.value === value)
  return c ? c[locale] : locale === "nl" ? "Overig" : "Other"
}

export function isCategory(value: string): value is SupplierCategory {
  return CATEGORIES.some((c) => c.value === value)
}
