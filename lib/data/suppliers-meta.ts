// Client-veilige metadata voor leveranciers (geen server-imports).
import type { Enums } from "@/types/database"

export type SupplierCategory = Enums<"supplier_category">

export const SUPPLIER_CATEGORIES: { value: SupplierCategory; label: string }[] =
  [
    { value: "sound", label: "Geluid" },
    { value: "light", label: "Licht" },
    { value: "stage", label: "Podium" },
    { value: "dj_gear", label: "DJ-apparatuur" },
    { value: "backline", label: "Backline" },
    { value: "other", label: "Overig" },
  ]

export function categoryLabel(value: string | null): string {
  return SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label ?? "Overig"
}

export function isCategory(value: string): value is SupplierCategory {
  return SUPPLIER_CATEGORIES.some((c) => c.value === value)
}
