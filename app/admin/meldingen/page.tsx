import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getI18n } from "@/lib/i18n"
import { setReportStatus } from "./actions"

export const dynamic = "force-dynamic"

// Beheerdersoverzicht van meldingen (UGC-moderatie, Apple 1.2).
export default async function MeldingenPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") redirect("/admin/login")

  const { locale } = await getI18n()
  const nl = locale === "nl"
  const dateLocale = nl ? "nl-NL" : "en-GB"

  const admin = createAdminClient()
  const { data: reports } = await admin
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, target_type, target_id, reason, details, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
  const list = reports ?? []

  const ids = Array.from(
    new Set(
      list.flatMap((r) => [r.reporter_id, r.reported_user_id].filter(Boolean)),
    ),
  ) as string[]
  const nameById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
    for (const p of profs ?? [])
      nameById.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8))
  }
  const nameOf = (id: string | null) => (id ? (nameById.get(id) ?? id.slice(0, 8)) : "-")

  const targetHref = (t: string, id: string | null) => {
    if (!id) return null
    if (t === "artist") return `/artists/${id}`
    if (t === "conversation") return `/messages/${id}`
    return null
  }

  const openCount = list.filter((r) => r.status === "open").length

  const reasonLabel: Record<string, [string, string]> = {
    inappropriate: ["Ongepaste inhoud", "Inappropriate content"],
    harassment: ["Intimidatie", "Harassment"],
    spam: ["Spam", "Spam"],
    scam: ["Oplichting", "Scam"],
    other: ["Anders", "Other"],
  }
  const reasonText = (r: string) => {
    const pair = reasonLabel[r]
    return pair ? (nl ? pair[0] : pair[1]) : r
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 safe-top">
        <h1 className="text-lg font-semibold">
          {nl ? "Meldingen" : "Reports"}{" "}
          <span className="ml-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
            {openCount} {nl ? "open" : "open"}
          </span>
        </h1>
        <Link
          href="/admin"
          className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
        >
          {nl ? "Terug" : "Back"}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
            {nl ? "Geen meldingen." : "No reports."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((r) => {
              const href = targetHref(r.target_type, r.target_id)
              return (
                <li
                  key={r.id}
                  className={`rounded-2xl border bg-surface p-4 ${
                    r.status === "open" ? "border-brand/40" : "border-border opacity-70"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{reasonText(r.reason)}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      {r.target_type}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      {r.status}
                    </span>
                    <span className="ml-auto text-xs text-muted">
                      {new Date(r.created_at).toLocaleString(dateLocale)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {nl ? "Melder" : "Reporter"}: {nameOf(r.reporter_id)} ·{" "}
                    {nl ? "Gemeld" : "Reported"}: {nameOf(r.reported_user_id)}
                  </p>
                  {r.details && (
                    <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      {r.details}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {href && (
                      <Link
                        href={href}
                        className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-brand/50"
                      >
                        {nl ? "Bekijk" : "View"}
                      </Link>
                    )}
                    {r.status === "open" ? (
                      <>
                        <form action={setReportStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="reviewed" />
                          <button
                            type="submit"
                            className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-black transition hover:bg-brand-strong"
                          >
                            {nl ? "Afgehandeld" : "Mark reviewed"}
                          </button>
                        </form>
                        <form action={setReportStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="dismissed" />
                          <button
                            type="submit"
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-500/50 hover:text-red-300"
                          >
                            {nl ? "Negeren" : "Dismiss"}
                          </button>
                        </form>
                      </>
                    ) : (
                      <form action={setReportStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="open" />
                        <button
                          type="submit"
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-brand/50"
                        >
                          {nl ? "Heropenen" : "Reopen"}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
