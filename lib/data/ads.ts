import { createClient } from "@/lib/supabase/server"
import type { Tables, Enums } from "@/types/database"

export type Ad = Tables<"ads">
export type AdPlacement = Enums<"ad_placement">

export const AD_PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: "events_top", label: "Bovenaan de agenda" },
  { value: "event_detail", label: "Op de eventpagina" },
  { value: "discover", label: "Op de ontdek-pagina" },
  { value: "sidebar", label: "Zijbalk" },
]

export function placementLabel(value: string): string {
  return AD_PLACEMENTS.find((p) => p.value === value)?.label ?? value
}

// Eén actieve advertentie voor een plek (gewogen, willekeurige rotatie).
export async function getAd(placement: AdPlacement): Promise<Ad | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from("ads")
    .select("*")
    .eq("placement", placement)
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${today}`)
    .or(`ends_at.is.null,ends_at.gte.${today}`)

  if (!data || data.length === 0) return null

  // Gewogen keuze op basis van weight.
  const pool: Ad[] = []
  for (const ad of data) {
    for (let i = 0; i < Math.max(1, ad.weight); i++) pool.push(ad)
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function getMyAds(userId: string): Promise<Ad[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("ads")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
  return data ?? []
}
