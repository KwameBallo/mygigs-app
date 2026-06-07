// Compacte volgersweergave: 1200 -> "1,2K", 25000 -> "25K", 1_200_000 -> "1,2M".
const compact = new Intl.NumberFormat("nl-NL", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatFollowers(n: number): string {
  return compact.format(n)
}
