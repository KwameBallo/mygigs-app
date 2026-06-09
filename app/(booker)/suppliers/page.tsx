import { getSuppliers } from "@/lib/data/suppliers"
import { AdSlot } from "@/components/ad-slot"
import { SuppliersClient } from "./suppliers-client"

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
    <SuppliersClient
      suppliers={suppliers}
      filters={{ q, category, city }}
      ad={<AdSlot placement="discover" />}
    />
  )
}
