type Gig = {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  city: string | null
  venue_name: string | null
  address: string | null
  status: string
}

type Labels = {
  timeTbd: string
  accepted: string
  paid: string
  done: string
}

const STATUS_COLOR: Record<string, string> = {
  accepted: "#f59e0b",
  paid: "#22c55e",
  completed: "#22c55e",
}

function hhmm(t: string | null) {
  return t ? t.slice(0, 5) : ""
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Duidelijk schema van geboekte optredens: gegroepeerd per maand, met datum,
// tijd en locatie. Server-component (geen interactie nodig).
export function GigSchedule({
  gigs,
  dateLocale,
  labels,
}: {
  gigs: Gig[]
  dateLocale: string
  labels: Labels
}) {
  const statusLabel = (s: string) =>
    s === "accepted" ? labels.accepted : s === "completed" ? labels.done : labels.paid

  // Groepeer op maand (de gigs zijn al oplopend op datum gesorteerd).
  const groups: { key: string; label: string; items: Gig[] }[] = []
  for (const g of gigs) {
    const d = new Date(g.event_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = cap(
      d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" }),
    )
    let group = groups.find((x) => x.key === key)
    if (!group) {
      group = { key, label, items: [] }
      groups.push(group)
    }
    group.items.push(g)
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {group.label}
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            {group.items.map((g) => {
              const date = new Date(g.event_date)
              const day = date.getDate()
              const weekday = date.toLocaleDateString(dateLocale, {
                weekday: "short",
              })
              const time =
                g.start_time && g.end_time
                  ? `${hhmm(g.start_time)} – ${hhmm(g.end_time)}`
                  : labels.timeTbd
              const where = g.venue_name ?? g.city ?? "—"
              const sub = g.address ?? (g.venue_name ? g.city : null)
              const color = STATUS_COLOR[g.status] ?? "#a1a1aa"
              return (
                <div
                  key={g.id}
                  className="flex overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="w-1 flex-none" style={{ background: color }} />
                  <div className="flex flex-1 items-start gap-3 p-3">
                    <div className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-xl bg-surface-2">
                      <span className="text-lg font-semibold leading-none">
                        {day}
                      </span>
                      <span className="text-[11px] uppercase text-muted">
                        {weekday}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <svg
                            viewBox="0 0 16 16"
                            className="h-4 w-4 text-brand"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <circle cx="8" cy="8" r="6.25" />
                            <path d="M8 4.75V8l2.25 1.25" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {time}
                        </span>
                        <span
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: `${color}22`, color }}
                        >
                          {statusLabel(g.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{where}</p>
                      {sub && (
                        <p className="truncate text-xs text-muted">{sub}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
