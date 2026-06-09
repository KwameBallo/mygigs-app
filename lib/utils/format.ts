// Compacte volgersweergave: 1200 -> "1,2K", 25000 -> "25K", 1_200_000 -> "1,2M".
const compact = new Intl.NumberFormat("nl-NL", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatFollowers(n: number): string {
  return compact.format(n)
}

// "2026-08-01" -> "za 1 aug"
const dayFmt = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
})

export function formatEventDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return dayFmt.format(d)
}

// "23:00:00" -> "23:00"
export function formatTime(time: string | null): string | null {
  if (!time) return null
  return time.slice(0, 5)
}
