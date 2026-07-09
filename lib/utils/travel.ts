import { PROVINCES, provinceCentroid } from "./provinces"
import { haversineKm } from "./geo"

// Aannames voor de reis-indicatie (heen én terug meegerekend).
// Bewust conservatief-realistisch voor NL; de DJ kan elk bedrag aanpassen.
const COST_PER_KM = 0.29 // brandstof + slijtage per gereden km
const DETOUR_FACTOR = 1.3 // wegen lopen niet kaarsrecht (centroïde → centroïde)
const AVG_SPEED_KMH = 80 // gemiddelde snelheid incl. stad/snelweg
const TIME_FEE_PER_HOUR = 20 // vergoeding voor reistijd (heen + terug)
const ROUND_TO = 25 // bedragen afronden op mooie stappen

export type RateSuggestion = {
  province: string
  km: number // enkele reis (indicatie), afgerond
  suggested: number // richtprijs + reistoeslag, afgerond
  inRange: boolean // binnen redelijke reisafstand → standaard aanvinken
}

/**
 * Stelt per provincie een rendabel totaalbedrag voor op basis van de
 * thuisprovincie en de basis-richtprijs. Puur rekenwerk (geen AI nodig):
 * afstand → reiskosten + reistijd → toeslag bovenop de richtprijs.
 */
export function suggestProvinceRates(
  homeProvince: string,
  baseGage: number,
  maxOneWayKm = 175,
): RateSuggestion[] {
  const home = provinceCentroid(homeProvince)
  if (!home || baseGage <= 0) return []

  return PROVINCES.map((p) => {
    if (p.name === homeProvince) {
      return { province: p.name, km: 0, suggested: baseGage, inRange: true }
    }
    const oneWay = haversineKm(home, p) * DETOUR_FACTOR
    const roundTrip = oneWay * 2
    const travelCost = roundTrip * COST_PER_KM
    const timeFee = (roundTrip / AVG_SPEED_KMH) * TIME_FEE_PER_HOUR
    const suggested = Math.max(
      baseGage,
      Math.round((baseGage + travelCost + timeFee) / ROUND_TO) * ROUND_TO,
    )
    return {
      province: p.name,
      km: Math.round(oneWay),
      suggested,
      inRange: oneWay <= maxOneWayKm,
    }
  })
}
