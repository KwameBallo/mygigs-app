import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Logo } from "@/components/logo"
import { LogoutIcon } from "@/components/icons"
import { formatEuro } from "@/lib/utils/pricing"
import { roleLabel } from "@/lib/roles"
import { getI18n } from "@/lib/i18n"
import { approveDjApplication, rejectDjApplication } from "./actions"
import { dict } from "./i18n"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") redirect("/")

  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"
  const rating1 = (n: number) =>
    n.toLocaleString(dateLocale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })

  const admin = createAdminClient()
  const [uRes, aRes, bRes, fRes, logRes, appRes] = await Promise.all([
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
    admin
      .from("audit_log")
      .select("id, action, actor_id, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("dj_applications")
      .select("user_id, motivation, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ])

  const users = uRes.data ?? []
  const artists = aRes.data ?? []
  const bookings = bRes.data ?? []
  const flags = fRes.data ?? []
  const auditLogs = logRes.data ?? []
  const pendingApps = appRes.data ?? []

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
            {d.badge}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/discover"
            className="rounded-full border border-border px-3 py-1.5 transition hover:border-brand/50"
          >
            {d.toApp}
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label={d.logout}
              className="rounded-full border border-border p-2 text-muted transition hover:text-foreground"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{d.dashboard}</h1>
        <p className="mt-1 text-sm text-muted">
          {d.subtitle}
        </p>

        {/* Metric-kaarten */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label={d.metricUsers} value={String(users.length)} />
          <Metric label={d.metricDjs} value={String(artists.length)} />
          <Metric label={d.metricBookings} value={String(bookings.length)} />
          <Metric label={d.metricRevenue} value={formatEuro(omzet)} />
          <Metric label={d.metricFee} value={formatEuro(fee)} />
          <Metric label={d.metricFlags} value={String(flags.length)} />
        </div>

        {/* Rollen + boekingstatus */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title={d.usersByRole}>
            <div className="flex flex-wrap gap-2 text-sm">
              {(["booker", "artist", "both", "admin"] as const).map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-surface-2 px-3 py-1 text-muted"
                >
                  {roleLabel(r, locale)}: <b className="text-foreground">{byRole(r)}</b>
                </span>
              ))}
            </div>
          </Panel>
          <Panel title={d.bookingsByStatus}>
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
        <Panel
          title={d.djsTitle.replace("{rating}", rating1(avgRating))}
          className="mt-4"
        >
          <Table
            head={[d.colDj, d.colCity, d.colRating, d.colGage, d.colVerified]}
            rows={artists.map((a) => [
              a.stage_name,
              a.home_city ?? "—",
              `${rating1(a.rating ?? 0)} (${a.reviews_count ?? 0})`,
              formatEuro(a.base_gage ?? 0),
              a.verified ? d.yes : "—",
            ])}
            empty={d.emptyDjs}
          />
        </Panel>

        {/* Recente boekingen */}
        <Panel title={d.recentBookings} className="mt-4">
          <Table
            head={[d.colDate, d.colCity, d.colStatus, d.colTotal, d.colFee]}
            rows={bookings
              .slice(0, 15)
              .map((b) => [
                b.event_date ?? "—",
                b.city ?? "—",
                b.status,
                formatEuro(b.total ?? 0),
                formatEuro(b.service_fee ?? 0),
              ])}
            empty={d.emptyBookings}
          />
        </Panel>

        {/* Gebruikers */}
        <Panel title={d.usersTitle} className="mt-4">
          <Table
            head={[d.colName, d.colEmail, d.colRole]}
            rows={users
              .slice(0, 20)
              .map((u) => [u.full_name ?? "—", u.email ?? "—", roleLabel(u.role, locale)])}
            empty={d.emptyUsers}
          />
        </Panel>

        {/* Chat-flags */}
        <Panel
          title={`${d.djApplications}${pendingApps.length ? ` (${pendingApps.length})` : ""}`}
          className="mt-4"
        >
          {pendingApps.length === 0 ? (
            <p className="text-sm text-muted">{d.noPendingApps}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingApps.map((app) => {
                const u = users.find((x) => x.id === app.user_id)
                return (
                  <div
                    key={app.user_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {u?.full_name ?? u?.email ?? app.user_id.slice(0, 8)}
                      </p>
                      {app.motivation && (
                        <p className="mt-0.5 text-xs text-muted">
                          {app.motivation}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-none gap-2">
                      <form action={approveDjApplication}>
                        <input type="hidden" name="user_id" value={app.user_id} />
                        <button
                          type="submit"
                          className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-black transition hover:bg-brand-strong"
                        >
                          {d.approve}
                        </button>
                      </form>
                      <form action={rejectDjApplication}>
                        <input type="hidden" name="user_id" value={app.user_id} />
                        <button
                          type="submit"
                          className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-red-400/50 hover:text-red-400"
                        >
                          {d.reject}
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel title={d.recentFlags} className="mt-4">
          <Table
            head={[d.colReason, d.colWhen]}
            rows={flags.map((f) => [
              f.reason ?? "—",
              f.created_at ? new Date(f.created_at).toLocaleString(dateLocale) : "—",
            ])}
            empty={d.emptyFlags}
          />
        </Panel>

        <Panel title={d.auditLog} className="mt-4">
          <Table
            head={[d.colAction, d.colTarget, d.colActor, d.colWhen]}
            rows={auditLogs.map((l) => [
              l.action,
              [l.target_type, l.target_id].filter(Boolean).join(" · ") || "—",
              l.actor_id ? `${l.actor_id.slice(0, 8)}…` : d.system,
              l.created_at
                ? new Date(l.created_at).toLocaleString(dateLocale)
                : "—",
            ])}
            empty={d.emptyAudit}
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
