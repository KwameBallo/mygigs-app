// Geen boekingsfee meer: het verdienmodel is een artiestenabonnement.
export const SERVICE_FEE_RATE = 0

export type PriceBreakdown = {
  gage: number
  serviceFee: number
  total: number
}

// Boeker betaalt de gage 1-op-1; het platform verdient via abonnementen.
export function priceBreakdown(gage: number): PriceBreakdown {
  return { gage, serviceFee: 0, total: gage }
}

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
})

export function formatEuro(amount: number): string {
  return euro.format(amount)
}
