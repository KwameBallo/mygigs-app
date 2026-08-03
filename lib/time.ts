// Tijd-helpers voor het boeken: duur uit een tijdvak afleiden en toetsen of
// dat vak binnen de beschikbaarheid (van/tot) van de DJ valt.

// "20:00:00" → "20:00" (input[type=time] verwacht HH:MM).
export function hhmm(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : ""
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Aantal minuten tussen start en eind. Eindigt de tijd op of vóór de starttijd,
// dan telt het als een nacht-overschrijdend optreden (+24 uur).
export function rangeMinutes(start: string, end: string): number {
  if (!start || !end) return 0
  let s = toMin(start)
  let e = toMin(end)
  if (e <= s) e += 1440
  return e - s
}

// Exacte duur in uren (pro rata, dus 2u15m = 2,25 uur — geen afronding naar
// halve uren). Bepaalt de gage: uurtarief × exacte duur.
export function rangeHours(start: string, end: string): number {
  return Math.round((rangeMinutes(start, end) / 60) * 100) / 100
}

// Duur leesbaar maken: "2 uur 15 min", "2 uur", of "45 min".
export function formatDuration(
  start: string,
  end: string,
  hUnit: string,
  mUnit: string,
): string {
  const total = rangeMinutes(start, end)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h && m) return `${h} ${hUnit} ${m} ${mUnit}`
  if (h) return `${h} ${hUnit}`
  return `${m} ${mUnit}`
}

// Valt [start,end] binnen het beschikbaarheidsvenster [winStart,winEnd]? Zonder
// venster (DJ = hele dag beschikbaar) is elk tijdstip toegestaan. Houdt rekening
// met vensters/optredens die middernacht overschrijden.
export function withinWindow(
  start: string,
  end: string,
  winStart: string | null,
  winEnd: string | null,
): boolean {
  if (!winStart || !winEnd) return true // hele dag beschikbaar
  if (!start || !end) return false
  let s = toMin(start)
  let e = toMin(end)
  if (e <= s) e += 1440
  let ws = toMin(winStart)
  let we = toMin(winEnd)
  if (we <= ws) we += 1440
  // Optreden binnen het venster, of (bij een nacht-venster) een uur later.
  if (s >= ws && e <= we) return true
  if (s + 1440 >= ws && e + 1440 <= we) return true
  return false
}
