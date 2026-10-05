import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"
import { checkAdmin } from "../aanmeldingen/guard"
import { SubmitButton } from "../aanmeldingen/submit-button"
import { zetAgent, zetProefstand, vinkAf, draaiNu } from "./actions"

export const dynamic = "force-dynamic"

// =============================================================
// Het beheerscherm voor de agents.
//
// Eén pagina die in tien seconden laat zien of alles loopt: wat er open staat,
// wie er draait, wanneer voor het laatst, en of er iets misging. Met de knoppen
// die daarbij horen: afvinken, aan of uit, en nu draaien.
//
// Bewust alleen in het Nederlands. Dit scherm is voor jou, niet voor klanten.
// =============================================================

type Level = Database["public"]["Enums"]["agent_alert_level"]

const NIVEAU: Record<Level, { label: string; klasse: string }> = {
  critical: {
    label: "Nu kijken",
    klasse: "border-red-500/40 bg-red-500/10 text-red-300",
  },
  warn: {
    label: "Kijk ernaar",
    klasse: "border-brand/40 bg-brand/10 text-brand",
  },
  info: { label: "Ter info", klasse: "border-border text-muted" },
}

const BERICHTEN: Record<string, { tekst: string; goed: boolean }> = {
  aangezet: { tekst: "De agent staat aan.", goed: true },
  uitgezet: { tekst: "De agent staat uit. Hij doet niets meer tot je hem weer aanzet.", goed: true },
  afgevinkt: { tekst: "Melding afgevinkt.", goed: true },
  gedraaid: { tekst: "De agent heeft gedraaid.", goed: true },
  proefAan: { tekst: "Bo staat weer in de proefstand. Hij telt, maar gooit niets weg.", goed: true },
  proefUit: { tekst: "Bo ruimt vanaf nu echt op.", goed: true },
  draaiMislukt: { tekst: "Het draaien lukte niet. Kijk in de logs van Vercel.", goed: false },
  geenSleutel: { tekst: "CRON_SECRET ontbreekt, dus handmatig draaien kan niet.", goed: false },
  error: { tekst: "Er ging iets mis.", goed: false },
}

function tijd(iso: string | null) {
  if (!iso) return "nog nooit"
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function geleden(iso: string | null) {
  if (!iso) return null
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return "zojuist"
  if (min < 60) return `${min} min geleden`
  const uur = Math.round(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  return `${Math.round(uur / 24)} dagen geleden`
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>
}) {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")

  const { msg } = await searchParams
  const bericht = msg ? BERICHTEN[msg] : undefined

  const admin = createAdminClient()
  const [agentsRes, runsRes, alertsRes] = await Promise.all([
    admin
      .from("agent_settings")
      .select("agent, display_name, role_label, enabled, schedule, config")
      .order("display_name"),
    admin
      .from("agent_runs")
      .select("agent, started_at, finished_at, ok, items_seen, items_acted, error")
      .order("started_at", { ascending: false })
      .limit(300),
    admin
      .from("agent_alerts")
      .select("id, agent, level, title, detail, first_seen_at, last_seen_at, seen_count")
      .is("resolved_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(50),
  ])

  const agents = agentsRes.data ?? []
  const runs = runsRes.data ?? []
  const meldingen = alertsRes.data ?? []

  const naam = new Map(agents.map((a) => [a.agent, a.display_name]))

  // Laatste run per agent, plus hoe het de afgelopen dag ging.
  const eenDagGeleden = Date.now() - 24 * 3600 * 1000
  const laatste = new Map<string, (typeof runs)[number]>()
  const dagTeller = new Map<string, { runs: number; fout: number }>()
  for (const r of runs) {
    if (!laatste.has(r.agent)) laatste.set(r.agent, r)
    if (new Date(r.started_at).getTime() >= eenDagGeleden) {
      const t = dagTeller.get(r.agent) ?? { runs: 0, fout: 0 }
      t.runs++
      if (r.ok === false) t.fout++
      dagTeller.set(r.agent, t)
    }
  }

  const volgorde: Level[] = ["critical", "warn", "info"]
  const gesorteerd = [...meldingen].sort(
    (a, b) => volgorde.indexOf(a.level) - volgorde.indexOf(b.level),
  )
  const kritiek = gesorteerd.filter((m) => m.level === "critical").length

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 safe-top">
        <Logo />
        <Link
          href="/admin"
          className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
        >
          Terug naar beheer
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted">
          {meldingen.length === 0
            ? "Er staat niets open. Alles loopt."
            : kritiek > 0
              ? `${kritiek} ding${kritiek === 1 ? "" : "en"} dat nu aandacht vraagt.`
              : `${meldingen.length} melding${meldingen.length === 1 ? "" : "en"} open.`}
        </p>

        {bericht && (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              bericht.goed
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            {bericht.tekst}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* Wat er open staat                                     */}
        {/* ---------------------------------------------------- */}
        {gesorteerd.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-muted">Open meldingen</h2>
            <ul className="flex flex-col gap-2">
              {gesorteerd.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${NIVEAU[m.level].klasse}`}
                    >
                      {NIVEAU[m.level].label}
                    </span>
                    <span className="text-xs text-muted">
                      {naam.get(m.agent) ?? m.agent}
                    </span>
                    {m.seen_count > 1 && (
                      <span className="text-xs text-muted">
                        {m.seen_count} keer gezien
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 font-medium">{m.title}</p>
                  {m.detail && (
                    <p className="mt-1 text-sm text-muted">{m.detail}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <time
                      dateTime={m.first_seen_at}
                      className="text-xs text-muted"
                    >
                      sinds {tijd(m.first_seen_at)}
                    </time>
                    <form action={vinkAf}>
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton
                        busyText="Bezig..."
                        className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
                      >
                        Afvinken
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------------------------------------------- */}
        {/* De agents zelf                                        */}
        {/* ---------------------------------------------------- */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted">De agents</h2>
          <ul className="flex flex-col gap-2">
            {agents.map((a) => {
              const run = laatste.get(a.agent)
              const teller = dagTeller.get(a.agent)
              const config = (a.config ?? {}) as unknown as Record<string, unknown>
              const proef = config.dry_run !== false
              const vastgelopen =
                run && !run.finished_at
                  ? Date.now() - new Date(run.started_at).getTime() > 30 * 60000
                  : false

              return (
                <li
                  key={a.agent}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {a.display_name}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${
                            a.enabled
                              ? "border-green-500/40 bg-green-500/10 text-green-300"
                              : "border-border text-muted"
                          }`}
                        >
                          {a.enabled ? "aan" : "uit"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted">{a.role_label}</p>
                      <p className="mt-2 text-xs text-muted">
                        {a.schedule ?? "geen tijdschema"}
                        {run ? ` · laatst ${geleden(run.started_at)}` : " · nog nooit gedraaid"}
                        {teller ? ` · ${teller.runs} keer vandaag` : ""}
                        {teller && teller.fout > 0 ? ` · ${teller.fout} mislukt` : ""}
                      </p>

                      {run?.ok === false && run.error && (
                        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                          Laatste run mislukte: {run.error.slice(0, 200)}
                        </p>
                      )}
                      {vastgelopen && (
                        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                          Draait al langer dan een half uur. Waarschijnlijk vastgelopen.
                        </p>
                      )}
                      {run?.ok && (run.items_seen > 0 || run.items_acted > 0) && (
                        <p className="mt-2 text-xs text-muted">
                          Laatste run: {run.items_seen} bekeken, {run.items_acted} gedaan
                        </p>
                      )}
                    </div>

                    <div className="flex flex-none flex-col items-end gap-2">
                      <form action={zetAgent}>
                        <input type="hidden" name="agent" value={a.agent} />
                        <input type="hidden" name="aan" value={a.enabled ? "0" : "1"} />
                        <SubmitButton
                          busyText="Bezig..."
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            a.enabled
                              ? "border-border hover:border-red-500/50"
                              : "border-brand bg-brand text-black"
                          }`}
                        >
                          {a.enabled ? "Uitzetten" : "Aanzetten"}
                        </SubmitButton>
                      </form>

                      {a.enabled && (
                        <form action={draaiNu}>
                          <input type="hidden" name="agent" value={a.agent} />
                          <SubmitButton
                            busyText="Draait..."
                            className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
                          >
                            Nu draaien
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* De opruimer heeft een extra schakelaar, want hij is de
                      enige die echt gegevens weggooit. */}
                  {a.agent === "opruimer" && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                      <p className="text-xs text-muted">
                        {proef
                          ? "Proefstand: hij telt alleen wat hij zou weghalen."
                          : "Hij ruimt echt op volgens de bewaartermijnen."}
                      </p>
                      <form action={zetProefstand}>
                        <input type="hidden" name="agent" value={a.agent} />
                        <input type="hidden" name="proef" value={proef ? "0" : "1"} />
                        <SubmitButton
                          busyText="Bezig..."
                          className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-brand/50"
                        >
                          {proef ? "Echt opruimen aanzetten" : "Terug naar proefstand"}
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <p className="mt-8 text-xs text-muted">
          Uitzetten is de noodknop: de agent slaat zijn beurt over zonder dat het
          een fout is, en de rest blijft gewoon lopen. Elke handeling op deze
          pagina komt in het audit-log.
        </p>
      </main>
    </div>
  )
}
