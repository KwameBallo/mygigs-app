// De 12 Nederlandse provincies + een geschat centroïde (lat/lng) voor
// afstand-benadering in Ontdek (provincie i.p.v. exact adres).
export const PROVINCES = [
  { name: "Drenthe", lat: 52.86, lng: 6.62 },
  { name: "Flevoland", lat: 52.53, lng: 5.6 },
  { name: "Friesland", lat: 53.16, lng: 5.78 },
  { name: "Gelderland", lat: 52.05, lng: 5.87 },
  { name: "Groningen", lat: 53.22, lng: 6.6 },
  { name: "Limburg", lat: 51.2, lng: 5.94 },
  { name: "Noord-Brabant", lat: 51.56, lng: 5.1 },
  { name: "Noord-Holland", lat: 52.6, lng: 4.86 },
  { name: "Overijssel", lat: 52.44, lng: 6.44 },
  { name: "Utrecht", lat: 52.09, lng: 5.16 },
  { name: "Zeeland", lat: 51.49, lng: 3.85 },
  { name: "Zuid-Holland", lat: 52.02, lng: 4.5 },
] as const

export const PROVINCE_NAMES = PROVINCES.map((p) => p.name)

export function provinceCentroid(name: string | null | undefined) {
  return PROVINCES.find((p) => p.name === name) ?? null
}
