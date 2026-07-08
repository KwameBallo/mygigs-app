import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Logo } from "@/components/logo"
import { LogoutIcon } from "@/components/icons"
import { formatEuro } from "@/lib/utils/pricing"
import { roleLabel } from "@/lib/roles"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") redirect("/")

  const admin = createAdminClient()
  const [uRes, aRes, bRes, fRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("artists")
      .select("id, stage_name, home_city, rating, reviews_count, base_gage, verified")
      .order("rating", { ascending: false }),
    admin
      .from("bookings")
      .select("id, status, total, service_fee, event_date, city, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("chat_flags")
      .select("id, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ])

  const users = uRes.data ?? []
  const artists = aRes.data ?? []
  const bookings = bRes.data ?? []
  const flags = fRes.data ?? []

  const byRole = (r: string) => users.filter((u) => u.role === r).length
  const avgRating =
    artists.length > 0
      ? artists.reduce((s, a) => s + (a.rating ?? 0), 0) / artists.length
      : 0
  const omzet = bookings.reduce((s, b) => s + (b.total ?? 0), 0)
  const fee = bookings.reduce((s, b) => s + (b.service_fee ?? 0), 0)
  const statuses = [
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "completed",
    "paid",
  ] as const
  const byStatus = (st: string) => bookings.filter((b) => b.status === st).length

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 safe-top">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Beheer
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/discover"
            className="rounded-full border border-border px-3 py-1.5 transition hover:border-brand/50"
          >
            Naar de app
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Uitloggen"
              className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overzicht van het hele platform.
        </p>

        {/* Metric-kaarten */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Gebruikers" value={String(users.length)} />
          <Metric label="DJ's" value={String(artists.length)} />
          <Metric label="Boekingen" value={String(bookings.length)} />
          <Metric label="Omzet" value={formatEuro(omzet)} />
          <Metric label="Fee (7%)" value={formatEuro(fee)} />
          <Metric label="Chat-flags" value={String(flags.length)} />
        </div>

        {/* Rollen + boekingstatus */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title="Gebruikers per rol">
            <div className="flex flex-wrap gap-2 text-sm">
              {(["booker", "artist", "both", "admin"] as const).map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-surface-2 px-3 py-1 text-muted"
                >
                  {roleLabel(r)}: <b className="text-foreground">{byRole(r)}</b>
                </span>
              ))}
            </div>
          </Panel>
          <Panel title="Boekingen per status">
            <div className="flex flex-wrap gap-2 text-sm">
              {statuses.map((st) => (
                <span
                  key={st}
                  className="rounded-full bg-surface-2 px-3 py-1 text-muted"
                >
                  {st}: <b className="text-foreground">{byStatus(st)}</b>
                </span>
              ))}
            </div>
          </Panel>
        </div>

        {/* DJ's */}
        <Panel title={`DJ's · gem. rating ${avgRating.toFixed(1)}`} className="mt-4">
          <Table
            head={["DJ", "Stad", "Rating", "Gage", "Geverifieerd"]}
            rows={artists.map((a) => [
              a.stage_name,
              a.home_city ?? "—",
              `${(a.rating ?? 0).toFixed(1)} (${a.reviews_count ?? 0})`,
              formatEuro(a.base_gage ?? 0),
              a.verified ? "Ja" : "—",
            ])}
            empty="Nog geen DJ's."
          />
        </Panel>

        {/* Recente boekingen */}
        <Panel title="Recente boekingen" className="mt-4">
          <Table
            head={["Datum", "Stad", "Status", "Totaal", "Fee"]}
            rows={bookings
              .slice(0, 15)
              .map((b) => [
                b.event_date ?? "—",
                b.city ?? "—",
                b.status,
                formatEuro(b.total ?? 0),
                formatEuro(b.service_fee ?? 0),
              ])}
            empty="Nog geen boekingen."
          />
        </Panel>

        {/* Gebruikers */}
        <Panel title="Gebruikers" className="mt-4">
          <Table
            head={["Naam", "E-mail", "Rol"]}
            rows={users
              .slice(0, 20)
              .map((u) => [u.full_name ?? "—", u.email ?? "—", roleLabel(u.role)])}
            empty="Nog geen gebruikers."
          />
        </Panel>

        {/* Chat-flags */}
        <Panel title="Recente chat-flags" className="mt-4">
          <Table
            head={["Reden", "Wanneer"]}
            rows={flags.map((f) => [
              f.reason ?? "—",
              f.created_at ? new Date(f.created_at).toLocaleString("nl-NL") : "—",
            ])}
            empty="Geen gemarkeerde berichten."
          />
        </Panel>
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-4 ${className}`}
    >
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  )
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[]
  rows: string[][]
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
