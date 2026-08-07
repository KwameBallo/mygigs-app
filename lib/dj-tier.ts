// DJ-activiteitsrang. Puur berekend (geen opgeslagen staat / cron nodig):
// - op basis van het aantal bevestigde boekingen in de huidige kalendermaand;
// - per 14 aaneengesloten dagen zonder nieuwe boeking zak je één rang.
//
// Drempels (boekingen deze maand):
//   0–5   → actief  (blauw)
//   6–14  → gewild  (geel)
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

// Begin van de huidige kalendermaand (ISO), voor de maand-telling.
export function startOfMonthISO(now: number = Date.now()): string {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function computeDjTier(
  countMonth: number,
  lastBookingISO: string | null,
  now: number = Date.now(),
): DjTier {
  let level = countMonth >= 15 ? 2 : countMonth >= 6 ? 1 : 0

  // Degradatie bij inactiviteit: per 14 dagen zonder boeking één rang omlaag.
  if (level > 0 && lastBookingISO) {
    const days = Math.floor((now - new Date(lastBookingISO).getTime()) / 86_400_000)
    if (days >= DECAY_DAYS) {
      level = Math.max(0, level - Math.floor(days / DECAY_DAYS))
    }
  }

  return TIERS[level]
}
