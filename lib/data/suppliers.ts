import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/database"
import { isCategory } from "@/lib/data/suppliers-meta"

export type Supplier = Tables<"suppliers">

export type SupplierFilters = {
  q?: string
  category?: string
  city?: string
}

export {
  SUPPLIER_CATEGORIES,
  categoryLabel,
  type SupplierCategory,
} from "@/lib/data/suppliers-meta"

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
