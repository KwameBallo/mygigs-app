// Verdienmodel MyGigs (single source of truth):
//  - Clubs/organisatoren: abonnement om events te plaatsen.
//  - Artiesten: staan 7% commissie af op elke boeking.
//  - Leveranciers: staan 10% commissie af.
//  - Drankmerken: betalen advertentiekosten (zie lib/data/ads-pricing).
export const ARTIST_COMMISSION_RATE = 0.07
export const SUPPLIER_COMMISSION_RATE = 0.1

export type PriceBreakdown = {
  gage: number // gage van de artiest (de boeker betaalt dit)
  commission: number // 7% die MyGigs bij de artiest inhoudt
  payout: number // wat de artiest netto ontvangt
  total: number // wat de boeker betaalt (= gage)
}

// De boeker betaalt de gage 1-op-1. MyGigs houdt 7% commissie in bij de artiest.
export function priceBreakdown(gage: number): PriceBreakdown {
  const commission = Math.round(gage * ARTIST_COMMISSION_RATE)
  return { gage, commission, payout: gage - commission, total: gage }
}

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
})

export function formatEuro(amount: number): string {
  return euro.format(amount)
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

// BTW-tarief in Nederland voor optredens/entertainment (21%).
export const VAT_RATE = 0.21

export type VatBreakdown = {
  net: number // bedrag exclusief BTW
  vat: number // BTW-bedrag
  gross: number // bedrag inclusief BTW (= wat de boeker betaalt)
}

// We behandelen het totaalbedrag als inclusief BTW en rekenen terug.
export function vatBreakdown(grossInclVat: number): VatBreakdown {
  const net = Math.round(grossInclVat / (1 + VAT_RATE))
  return { net, vat: grossInclVat - net, gross: grossInclVat }
}
