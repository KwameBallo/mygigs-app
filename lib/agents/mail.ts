import "server-only"
import { sendEmail } from "@/lib/email"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

// =============================================================
// Het bericht naar info@mygigs.nl met wat de agents gevonden hebben.
//
// Eén mail per keer, met alle open meldingen die nog niet gemeld zijn. Een
// melding wordt dus hooguit één keer gestuurd; blijft hij openstaan, dan zie je
// hem verder alleen in het beheerscherm. Zo wordt de inbox nooit een alarmbel
// die de hele dag afgaat.
// =============================================================

type Level = Database["public"]["Enums"]["agent_alert_level"]

const ALERT_TO = process.env.AGENT_ALERT_EMAIL || "info@mygigs.nl"

function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.mygigs.nl"
  )
}

const LEVEL_LABEL: Record<Level, string> = {
  critical: "Nu kijken",
  warn: "Kijk ernaar",
  info: "Ter info",
}

const LEVEL_COLOR: Record<Level, string> = {
  critical: "#ff4d3d",
  warn: "#ff6f14",
  info: "#8b8b93",
}

/**
 * Stuurt de open meldingen die nog niet gemeld zijn.
 * Geeft terug hoeveel meldingen er in de mail zaten.
 */
export async function notifyOpenAlerts(): Promise<number> {
  const admin = createAdminClient()

  const { data: alerts, error } = await admin
    .from("agent_alerts")
    .select("id, agent, key, level, title, detail, first_seen_at, seen_count")
    .is("resolved_at", null)
    .is("notified_at", null)
    .order("first_seen_at", { ascending: true })
    .limit(40)

  if (error || !alerts || alerts.length === 0) return 0

  // Namen van de agents erbij, zodat er "Wolf" in de mail staat en niet
  // "waakhond".
  const { data: agents } = await admin
    .from("agent_settings")
    .select("agent, display_name")
  const naam = new Map((agents ?? []).map((a) => [a.agent, a.display_name]))

  const order: Level[] = ["critical", "warn", "info"]
  const sorted = [...alerts].sort(
    (a, b) => order.indexOf(a.level) - order.indexOf(b.level),
  )

  const rows = sorted
    .map((a) => {
      const when = new Date(a.first_seen_at).toLocaleString("nl-NL", {
        timeZone: "Europe/Amsterdam",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      const times = a.seen_count > 1 ? ` (${a.seen_count} keer gezien)` : ""
      return `
      <tr><td style="padding:14px 0;border-bottom:1px solid #26262a;">
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${LEVEL_COLOR[a.level]};font-weight:700;">
          ${esc(LEVEL_LABEL[a.level])} &middot; ${esc(naam.get(a.agent) ?? a.agent)}
        </div>
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#f5f4f2;font-weight:600;margin-top:4px;">
          ${esc(a.title)}
        </div>
        ${
          a.detail
            ? `<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#a9a9b2;margin-top:4px;">${esc(
                a.detail,
              )}</div>`
            : ""
        }
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#6c6c74;margin-top:6px;">
          sinds ${esc(when)}${esc(times)}
        </div>
      </td></tr>`
    })
    .join("")

  const criticals = sorted.filter((a) => a.level === "critical").length
  const subject =
    criticals > 0
      ? `MyGigs: ${criticals} ding${criticals === 1 ? "" : "en"} dat nu aandacht vraagt`
      : `MyGigs: ${sorted.length} melding${sorted.length === 1 ? "" : "en"} van de agents`

  const html = `<!doctype html><html lang="nl"><body style="margin:0;padding:0;background:#0b0b0c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0b0c;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
      <tr><td align="center" style="padding:0 0 24px;">
        <img src="${siteUrl()}/mail-logo.png" width="120" alt="MyGigs" style="display:block;width:120px;height:auto;border:0;">
      </td></tr>
      <tr><td style="background:#161618;border-radius:18px;padding:28px 24px;">
        <h1 style="margin:0 0 6px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#f5f4f2;">
          Wat er speelt
        </h1>
        <p style="margin:0 0 8px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#8b8b93;">
          Dit hebben de agents gevonden sinds het vorige bericht.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;">
          <tr><td align="center" bgcolor="#ff6f14" style="border-radius:999px;">
            <a href="${siteUrl()}/admin/agents"
               style="display:inline-block;padding:13px 26px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:999px;">
              Open het beheerscherm
            </a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 6px 0;">
        <p style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#6c6c74;">
          Automatisch bericht van de agents van MyGigs. Je krijgt elke melding
          maar één keer; de rest staat in het beheerscherm.
        </p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`

  const res = await sendEmail({ to: ALERT_TO, subject, html })
  if (!res.ok) return 0

  await admin
    .from("agent_alerts")
    .update({ notified_at: new Date().toISOString() })
    .in(
      "id",
      sorted.map((a) => a.id),
    )

  return sorted.length
}
