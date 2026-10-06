import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToAdmins } from "@/lib/push"
import type { Database, Json } from "@/types/database"

// =============================================================
// Gereedschap dat elke agent gebruikt.
//
// Een agent is een route onder app/api/agents/<naam>, gestart door de planner
// en beveiligd met CRON_SECRET. Deze module regelt de saaie dingen die overal
// hetzelfde zijn: staat de agent aan, een regel in agent_runs, meldingen
// aanmaken of juist sluiten, en de rem op het aantal acties per run.
//
// Grenzen uit docs/agents.md, die hier ook in code staan:
//   - geen agent verplaatst geld
//   - geen agent keurt zelf een DJ goed
//   - elke agent kan uit met één schakelaar in agent_settings
// =============================================================

export type AlertLevel = Database["public"]["Enums"]["agent_alert_level"]
type Admin = ReturnType<typeof createAdminClient>

export type AgentSettings = {
  agent: string
  displayName: string
  roleLabel: string
  enabled: boolean
  config: Record<string, unknown>
  maxActions: number
}

export type AgentContext = {
  admin: Admin
  settings: AgentSettings
  /** Grenswaarde uit agent_settings.config, met een terugvalwaarde. */
  num: (key: string, fallback: number) => number
  /** Melding aanmaken of bijwerken. Ontdubbelt op (agent, key). */
  alert: (a: {
    key: string
    title: string
    level?: AlertLevel
    detail?: string
    targetType?: string
    targetId?: string
  }) => Promise<void>
  /** Meldingen sluiten die niet meer spelen. Prefix bijvoorbeeld "stuck_booking:". */
  resolveGone: (prefix: string, stillOpenKeys: string[]) => Promise<number>
  /** Een actie aftellen. Geeft false zodra de rem bereikt is. */
  allowAction: () => boolean
}

/** Controleert de sleutel van de planner. */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  return Boolean(secret) && auth === `Bearer ${secret}`
}

async function loadSettings(admin: Admin, agent: string): Promise<AgentSettings | null> {
  const { data, error } = await admin
    .from("agent_settings")
    .select("agent, display_name, role_label, enabled, config, max_actions")
    .eq("agent", agent)
    .maybeSingle()
  if (error || !data) return null
  return {
    agent: data.agent,
    displayName: data.display_name,
    roleLabel: data.role_label,
    enabled: data.enabled,
    config: (data.config ?? {}) as Record<string, unknown>,
    maxActions: data.max_actions,
  }
}

/**
 * Draait het werk van een agent en houdt de boekhouding bij.
 *
 * Staat de agent uit, dan gebeurt er niets en is dat ook geen fout: zo kun je
 * een agent stilzetten zonder de planner aan te passen.
 */
export async function runAgent(
  agent: string,
  work: (ctx: AgentContext) => Promise<{
    seen: number
    acted: number
    /** Wat de AI deze run kostte, in euro. Blijft 0 bij agents zonder AI. */
    aiCostEur?: number
    meta?: Record<string, unknown>
  }>,
): Promise<{
  status: number
  body: Record<string, unknown>
}> {
  const admin = createAdminClient()
  const settings = await loadSettings(admin, agent)
  if (!settings) {
    return { status: 404, body: { error: `agent ${agent} bestaat niet` } }
  }
  if (!settings.enabled) {
    return { status: 200, body: { agent, naam: settings.displayName, overgeslagen: "staat uit" } }
  }

  const { data: run } = await admin
    .from("agent_runs")
    .insert({ agent })
    .select("id")
    .single()
  const runId = run?.id ?? null

  let actionsLeft = settings.maxActions
  const ctx: AgentContext = {
    admin,
    settings,
    num: (key, fallback) => {
      const v = settings.config?.[key]
      return typeof v === "number" && Number.isFinite(v) ? v : fallback
    },
    alert: (a) => raiseAlert(admin, agent, a),
    resolveGone: (prefix, keys) => resolveGone(admin, agent, prefix, keys),
    allowAction: () => {
      if (actionsLeft <= 0) return false
      actionsLeft -= 1
      return true
    },
  }

  try {
    const result = await work(ctx)
    if (runId) {
      await admin
        .from("agent_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: true,
          items_seen: result.seen,
          items_acted: result.acted,
          // Afgerond op vier decimalen, want dat is wat de kolom aankan en een
          // tiende van een cent is nauwkeurig genoeg.
          ai_cost_eur: Math.round((result.aiCostEur ?? 0) * 10000) / 10000,
          meta: (result.meta ?? {}) as unknown as Json,
        })
        .eq("id", runId)
    }
    return {
      status: 200,
      body: {
        agent,
        naam: settings.displayName,
        bekeken: result.seen,
        gedaan: result.acted,
        rem_bereikt: actionsLeft <= 0,
      },
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (runId) {
      await admin
        .from("agent_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: false,
          error: message.slice(0, 4000),
        })
        .eq("id", runId)
    }
    // Een agent die stukloopt is zelf ook een melding waard.
    await raiseAlert(admin, agent, {
      key: `agent_error:${agent}`,
      level: "critical",
      title: `${settings.displayName} liep vast`,
      detail: message.slice(0, 4000),
    })
    console.error(`agent ${agent} fout:`, message)
    return { status: 500, body: { agent, error: message } }
  }
}

/**
 * Meldingen aanmaken of bijwerken.
 *
 * Bestaat er al een open melding met dezelfde sleutel, dan wordt de teller
 * opgehoogd en het tijdstip ververst. Zo blijft het bij één regel, ook als de
 * waakhond hetzelfde probleem honderd keer ziet.
 */
async function raiseAlert(
  admin: Admin,
  agent: string,
  a: {
    key: string
    title: string
    level?: AlertLevel
    detail?: string
    targetType?: string
    targetId?: string
  },
): Promise<void> {
  const { data: open } = await admin
    .from("agent_alerts")
    .select("id, seen_count")
    .eq("agent", agent)
    .eq("key", a.key)
    .is("resolved_at", null)
    .maybeSingle()

  if (open) {
    await admin
      .from("agent_alerts")
      .update({
        last_seen_at: new Date().toISOString(),
        seen_count: open.seen_count + 1,
        level: a.level ?? "warn",
        title: a.title.slice(0, 200),
        detail: a.detail?.slice(0, 4000) ?? null,
      })
      .eq("id", open.id)
    return
  }

  const { error } = await admin.from("agent_alerts").insert({
    agent,
    key: a.key.slice(0, 200),
    level: a.level ?? "warn",
    title: a.title.slice(0, 200),
    detail: a.detail?.slice(0, 4000) ?? null,
    target_type: a.targetType ?? null,
    target_id: a.targetId ?? null,
  })
  if (error) {
    console.error("melding aanmaken mislukt:", error.message)
    return
  }

  // Alleen bij een nieuwe kritieke melding een pushbericht. Hierboven staat de
  // tak waarin de melding al open was; die hoogt alleen de teller op en duwt
  // dus niet opnieuw. Zo krijg je één bericht per probleem, niet één per run.
  if ((a.level ?? "warn") === "critical") {
    try {
      await sendPushToAdmins({
        title: a.title.slice(0, 120),
        body: a.detail?.slice(0, 200) || "Kijk in het beheerscherm.",
        url: "/admin/agents",
        // Zelfde probleem, zelfde tag: vervangt de vorige in plaats van te
        // stapelen op je vergrendelscherm.
        tag: `agent:${agent}:${a.key}`,
      })
    } catch (e) {
      console.error("push bij kritieke melding mislukt:", e)
    }
  }
}

/**
 * Sluit meldingen waarvan het probleem weg is.
 *
 * De agent geeft door welke sleutels met dit voorvoegsel nu nog spelen; alle
 * andere open meldingen met datzelfde voorvoegsel worden afgevinkt. Zo ruimt
 * de agent zijn eigen lijst op zonder dat jij iets hoeft te doen.
 */
async function resolveGone(
  admin: Admin,
  agent: string,
  prefix: string,
  stillOpenKeys: string[],
): Promise<number> {
  const { data: open } = await admin
    .from("agent_alerts")
    .select("id, key")
    .eq("agent", agent)
    .is("resolved_at", null)
    .like("key", `${prefix}%`)

  const gone = (open ?? []).filter((row) => !stillOpenKeys.includes(row.key))
  if (gone.length === 0) return 0

  await admin
    .from("agent_alerts")
    .update({
      resolved_at: new Date().toISOString(),
      resolve_note: "vanzelf opgelost",
    })
    .in(
      "id",
      gone.map((row) => row.id),
    )
  return gone.length
}
