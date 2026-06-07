import { createClient } from "@/lib/supabase/server"
import type { Tables, Enums } from "@/types/database"

export type Supplier = Tables<"suppliers">
export type SupplierCategory = Enums<"supplier_category">

export type SupplierFilters = {
  q?: string
  category?: string
  city?: string
}

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
  return (
    SUPPLIER_CATEGORIES.find((c) => c.value === value)?.label ?? "Overig"
  )
}

function isCategory(value: string): value is SupplierCategory {
  return SUPPLIER_CATEGORIES.some((c) => c.value === value)
}

export async function getSuppliers(
  filters: SupplierFilters = {},
): Promise<Supplier[]> {
  const supabase = await createClient()
  let query = supabase
    .from("suppliers")
    .select("*")
    .order("rating", { ascending: false })
    .order("name", { ascending: true })

  if (filters.q) {
    query = query.ilike("name", `%${filters.q}%`)
  }
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`)
  }
  if (filters.category && isCategory(filters.category)) {
    query = query.eq("category", filters.category)
  }

  const { data } = await query
  return data ?? []
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  return data ?? null
}
