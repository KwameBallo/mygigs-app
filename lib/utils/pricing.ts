// Platform service fee charged on top of the artist's gage.
export const SERVICE_FEE_RATE = 0.07

export type PriceBreakdown = {
  gage: number
  serviceFee: number
  total: number
}

// Booker pays gage + 7%. Artist receives the gage; platform keeps the fee.
export function priceBreakdown(gage: number): PriceBreakdown {
  const serviceFee = Math.round(gage * SERVICE_FEE_RATE * 100) / 100
  return { gage, serviceFee, total: gage + serviceFee }
}

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
})

export function formatEuro(amount: number): string {
  return euro.format(amount)
}
