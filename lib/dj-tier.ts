// DJ-activiteitsrang. Puur berekend (geen opgeslagen staat / cron nodig):
// - op basis van het aantal bevestigde boekingen in de laatste 30 dagen;
// - per 14 aaneengesloten dagen zonder nieuwe boeking zak je één rang.
//
// Drempels (boekingen / 30 dagen):
//   0–4   → actief  (blauw)
//   5–14  → gewild  (geel)
//   15+   → hot     (rood)

export type TierKey = "actief" | "gewild" | "hot"

export type DjTier = {
  key: TierKey
  level: number
  color: string
}

const TIERS: DjTier[] = [
  { key: "actief", level: 0, color: "#3b82f6" }, // blauw
  { key: "gewild", level: 1, color: "#eab308" }, // geel
  { key: "hot", level: 2, color: "#ef4444" }, // rood
]

// Dagen zonder boeking voordat je een rang zakt.
export const DECAY_DAYS = 14

export function computeDjTier(
  count30d: number,
  lastBookingISO: string | null,
  now: number = Date.now(),
): DjTier {
  let level = count30d >= 15 ? 2 : count30d >= 5 ? 1 : 0

  // Degradatie bij inactiviteit: per 14 dagen zonder boeking één rang omlaag.
  if (level > 0 && lastBookingISO) {
    const days = Math.floor((now - new Date(lastBookingISO).getTime()) / 86_400_000)
    if (days >= DECAY_DAYS) {
      level = Math.max(0, level - Math.floor(days / DECAY_DAYS))
    }
  }

  return TIERS[level]
}
