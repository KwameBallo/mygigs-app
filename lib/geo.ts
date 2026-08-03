// Adresverificatie via PDOK Locatieserver (gratis, officiële BAG-data). Alleen
// bestaande Nederlandse adressen leveren een resultaat — dat is meteen onze
// "bestaat dit adres echt?"-check. Levert ook coördinaten voor navigatie.

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1"

export type VerifiedAddress = {
  id: string
  address: string // volledige weergavenaam, bv. "Dam 1, 1012JS Amsterdam"
  city: string | null
  postalCode: string | null
  lat: number
  lng: number
}

// "POINT(4.89 52.37)" → { lng, lat }.
function parsePoint(wkt: string | undefined): { lat: number; lng: number } | null {
  if (!wkt) return null
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt)
  if (!m) return null
  const lng = Number(m[1])
  const lat = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

// Zoek een adres-id op bij PDOK en geef het geverifieerde adres + coördinaten
// terug. Server-side aangeroepen zodat de boeker de coördinaten niet kan spoofen.
export async function pdokLookup(id: string): Promise<VerifiedAddress | null> {
  if (!id) return null
  const url = `${PDOK}/lookup?id=${encodeURIComponent(
    id,
  )}&fl=id,weergavenaam,centroide_ll,postcode,woonplaatsnaam,type`
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return null
    const json = await res.json()
    const doc = json?.response?.docs?.[0]
    if (!doc || doc.type !== "adres") return null
    const point = parsePoint(doc.centroide_ll)
    if (!point) return null
    return {
      id: doc.id,
      address: doc.weergavenaam ?? "",
      city: doc.woonplaatsnaam ?? null,
      postalCode: doc.postcode ?? null,
      lat: point.lat,
      lng: point.lng,
    }
  } catch {
    return null
  }
}

// Afstand tussen twee coördinaten in meters (Haversine). Gebruikt om te toetsen
// of de DJ bij zijn check-in echt op de event-locatie stond.
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000 // aardstraal in meter
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

// Binnen deze straal (meter) telt een check-in als "op locatie".
export const CHECKIN_RADIUS_M = 300
