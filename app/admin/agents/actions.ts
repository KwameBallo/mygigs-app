"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import type { Json } from "@/types/database"
import { checkAdmin } from "../aanmeldingen/guard"

// =============================================================
// De knoppen van het beheerscherm voor de agents.
//
// Alles hier gaat door dezelfde poort als de DJ-wachtrij: beheerder én, als je
// 2FA hebt ingesteld, een sessie waarin die 2FA bevestigd is. De controle staat
// bewust in elke actie en niet alleen op de pagina: een knop is een eigen
// ingang naar de server.
//
// Elke handeling komt in het audit-log. Als een agent iets doet moet je later
// kunnen zien wie hem aan of uit zette, en wanneer.
// =============================================================

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://mygigs-app-t7ve.vercel.app"
  )
}

async function poort() {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")
  return check.userId
}

/** Controleert dat de naam echt een agent is, zodat een knop niets anders kan aanroepen. */
async function bestaandeAgent(agent: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("agent_settings")
    .select("agent, display_name, enabled, config")
    .eq("agent", agent)
    .maybeSingle()
  return data
}

/** Zet een agent aan of uit. De noodknop uit het plan. */
export async function zetAgent(formData: FormData) {
  const userId = await poort()
  const agent = String(formData.get("agent") ?? "")
  const aan = String(formData.get("aan") ?? "") === "1"

  const bestaat = await bestaandeAgent(agent)
  if (!bestaat) redirect("/admin/agents?msg=error")

  const admin = createAdminClient()
  const { error } = await admin
    .from("agent_settings")
    .update({ enabled: aan })
    .eq("agent", agent)

  if (error) {
    console.error("agent aan/uit mislukt:", error.message)
    redirect("/admin/agents?msg=error")
  }

  await logAudit({
    actorId: userId,
    action: aan ? "agent_aangezet" : "agent_uitgezet",
    targetType: "agent",
    targetId: agent,
    metadata: { naam: bestaat.display_name },
  })

  revalidatePath("/admin/agents")
  redirect(`/admin/agents?msg=${aan ? "aangezet" : "uitgezet"}`)
}

/**
 * Zet de proefstand van de opruimer aan of uit.
 *
 * In de proefstand telt Bo alleen wat hij zou weghalen. Dit is de enige knop
 * waarmee een agent echt gegevens gaat verwijderen, dus hij staat apart en
 * wordt apart gelogd.
 */
export async function zetProefstand(formData: FormData) {
  const userId = await poort()
  const agent = String(formData.get("agent") ?? "")
  const proef = String(formData.get("proef") ?? "") === "1"

  const bestaat = await bestaandeAgent(agent)
  if (!bestaat) redirect("/admin/agents?msg=error")

  const huidig = (bestaat.config ?? {}) as unknown as Record<string, unknown>
  const config = { ...huidig, dry_run: proef } as unknown as Json

  const admin = createAdminClient()
  const { error } = await admin
    .from("agent_settings")
    .update({ config })
    .eq("agent", agent)

  if (error) {
    console.error("proefstand wijzigen mislukt:", error.message)
    redirect("/admin/agents?msg=error")
  }

  await logAudit({
    actorId: userId,
    action: proef ? "opruimer_proefstand_aan" : "opruimer_proefstand_uit",
    targetType: "agent",
    targetId: agent,
  })

  revalidatePath("/admin/agents")
  redirect(`/admin/agents?msg=${proef ? "proefAan" : "proefUit"}`)
}

/** Vinkt een melding af. Komt hij terug, dan is het een nieuwe melding. */
export async function vinkAf(formData: FormData) {
  const userId = await poort()
  const id = String(formData.get("id") ?? "")
  if (!id) redirect("/admin/agents?msg=error")

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agent_alerts")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolve_note: "afgevinkt in het beheerscherm",
    })
    .eq("id", id)
    .is("resolved_at", null)
    .select("agent, key")
    .maybeSingle()

  if (error) {
    console.error("melding afvinken mislukt:", error.message)
    redirect("/admin/agents?msg=error")
  }

  await logAudit({
    actorId: userId,
    action: "melding_afgevinkt",
    targetType: "agent_alert",
    targetId: id,
    metadata: { agent: data?.agent, key: data?.key },
  })

  revalidatePath("/admin/agents")
  redirect("/admin/agents?msg=afgevinkt")
}

/**
 * Laat een agent nu draaien, zonder op zijn tijdschema te wachten.
 *
 * We roepen zijn eigen route aan met dezelfde sleutel als de planner. De naam
 * is eerst gecontroleerd tegen de lijst in de database, zodat hier nooit een
 * ander adres ingevuld kan worden.
 */
export async function draaiNu(formData: FormData) {
  const userId = await poort()
  const agent = String(formData.get("agent") ?? "")

  const bestaat = await bestaandeAgent(agent)
  if (!bestaat) redirect("/admin/agents?msg=error")

  const secret = process.env.CRON_SECRET
  if (!secret) redirect("/admin/agents?msg=geenSleutel")

  // De aanroep staat bewust in een eigen blok, los van de redirect eronder.
  // redirect() werkt door een fout te gooien; zou die binnen deze try vallen,
  // dan vingen we onze eigen navigatie op.
  let status = 0
  try {
    const res = await fetch(`${siteUrl()}/api/agents/${agent}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
    status = res.status
  } catch (e) {
    console.error("agent handmatig draaien mislukt:", e)
  }

  await logAudit({
    actorId: userId,
    action: "agent_handmatig_gedraaid",
    targetType: "agent",
    targetId: agent,
    metadata: { status },
  })

  revalidatePath("/admin/agents")
  redirect(`/admin/agents?msg=${status === 200 ? "gedraaid" : "draaiMislukt"}`)
}
