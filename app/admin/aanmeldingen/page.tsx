import Link from "next/link"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getI18n } from "@/lib/i18n"
import { checkAdmin } from "./guard"
import { addManualLead } from "./actions"
import { SubmitButton } from "./submit-button"
import { dict } from "./i18n"
import {
  AdminHeader,
  Flash,
  Panel,
  StatusPill,
  sourceLabel,
  type LeadStatus,
} from "./ui"

export const dynamic = "force-dynamic"

// De wachtrij: alles wat binnenkwam voor een nieuw DJ-profiel, per status.

const TABS = {
  open: ["new", "reviewing"],
  approved: ["approved"],
  rejected: ["rejected"],
  claimed: ["claimed"],
} satisfies Record<string, LeadStatus[]>

type Tab = keyof typeof TABS

export default async function AanmeldingenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; msg?: string }>
}) {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")

  const { tab: tabParam, msg } = await searchParams
  const tab: Tab = tabParam && tabParam in TABS ? (tabParam as Tab) : "open"

  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const service = createAdminClient()
  const [listRes, countRes] = await Promise.all([
    service
      .from("dj_leads")
      .select(
        "id, status, source, self_submitted, stage_name, raw_from, home_city, genres, received_at",
      )
      .in("status", TABS[tab])
      .order("received_at", { ascending: false })
      .limit(200),
    service.from("dj_leads").select("status"),
  ])

  const leads = listRes.data ?? []
  const counts: Record<Tab, number> = { open: 0, approved: 0, rejected: 0, claimed: 0 }
  for (const row of countRes.data ?? []) {
    for (const [t, statuses] of Object.entries(TABS) as [Tab, LeadStatus[]][]) {
      if (statuses.includes(row.status)) counts[t]++
    }
  }

  const tabLabel: Record<Tab, string> = {
    open: d.tabOpen,
    approved: d.tabApproved,
    rejected: d.tabRejected,
    claimed: d.tabClaimed,
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminHeader d={d} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
        <p className="mt-1 text-sm text-muted">{d.subtitle}</p>

        <Flash msg={msg} d={d} />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Wachtrij */}
          <section>
            <nav className="flex flex-wrap gap-2" aria-label={d.title}>
              {(Object.keys(TABS) as Tab[]).map((t) => (
                <Link
                  key={t}
                  href={t === "open" ? "/admin/aanmeldingen" : `/admin/aanmeldingen?tab=${t}`}
                  aria-current={t === tab ? "page" : undefined}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    t === tab
                      ? "border-brand bg-brand text-black"
                      : "border-border hover:border-brand/50"
                  }`}
                >
                  {tabLabel[t]}
                  <span className={`ml-1.5 ${t === tab ? "text-black/70" : "text-muted"}`}>
                    {counts[t]}
                  </span>
                </Link>
              ))}
            </nav>

            <ul className="mt-4 flex flex-col gap-2">
              {leads.length === 0 && (
                <li className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
                  {d.empty}
                </li>
              )}
              {leads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/admin/aanmeldingen/${l.id}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {l.stage_name || <span className="text-muted">{d.noName}</span>}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {[l.home_city, l.genres.slice(0, 3).join(", ")]
                          .filter(Boolean)
                          .join(" · ") || l.raw_from || ""}
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{sourceLabel(l.source, d)}</span>
                        <span aria-hidden>·</span>
                        <span>{l.self_submitted ? d.selfSubmitted : d.foundByAdmin}</span>
                        <span aria-hidden>·</span>
                        <time dateTime={l.received_at}>
                          {new Date(l.received_at).toLocaleDateString(dateLocale, {
                            day: "numeric",
                            month: "short",
                          })}
                        </time>
                      </p>
                    </div>
                    <StatusPill status={l.status} d={d} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Zelf een DJ toevoegen */}
          <Panel title={d.addTitle} className="h-fit">
            <p className="-mt-1 mb-4 text-sm text-muted">{d.addIntro}</p>
            <form action={addManualLead} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{d.addRawLabel}</span>
                <textarea
                  name="raw_text"
                  required
                  rows={7}
                  maxLength={20000}
                  placeholder={d.addRawPlaceholder}
                  className="input min-h-40 resize-y font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{d.addSourceLabel}</span>
                <input
                  name="source_note"
                  required
                  maxLength={1000}
                  placeholder={d.addSourcePlaceholder}
                  className="input"
                />
                <span className="text-xs text-muted">{d.addSourceHint}</span>
              </label>
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="self_submitted"
                  className="mt-1 h-4 w-4 flex-none accent-brand"
                />
                <span>
                  <span className="text-sm font-medium">{d.addSelfLabel}</span>
                  <span className="mt-0.5 block text-xs text-muted">{d.addSelfHint}</span>
                </span>
              </label>
              <SubmitButton
                busyText={d.addBusy}
                className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
              >
                {d.addBtn}
              </SubmitButton>
            </form>
          </Panel>
        </div>
      </main>
    </div>
  )
}
