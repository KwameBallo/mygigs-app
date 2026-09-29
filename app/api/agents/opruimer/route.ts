import { NextResponse } from "next/server"
import { runAgent, authorizeCron } from "@/lib/agents/core"
import { notifyOpenAlerts } from "@/lib/agents/mail"

// =============================================================
// Bo, de opruimer.
//
// Gegevens die je niet meer nodig hebt horen weg te gaan. Dat is niet alleen
// netjes, het is ook wat de AVG vraagt: bewaar niet langer dan nodig voor het
// doel waarvoor je het verzamelde. Bo doet dat elke nacht, met per soort
// gegeven een eigen bewaartermijn uit agent_settings.
//
// Bo is de enige agent die dingen weggooit. Daarom:
//   - hij begint in de proefstand (`dry_run`). Dan telt hij alleen en meldt hij
//     wat hij zou opruimen. Jij zet hem aan als je het eens bent met de lijst.
//   - elke termijn staat in de instellingen, niet in de code
//   - hij raakt geen boekingen, betalingen, facturen, berichten of reviews aan.
//     Dat zijn je administratie en je bewijs; daar hoort een mens over te gaan.
//   - foto's van afgewezen aanmeldingen gaan mee uit de opslag, anders blijven
//     de bestanden achter terwijl de regel in de database weg is.
// =============================================================

export const dynamic = "force-dynamic"

const dag = 24 * 3600 * 1000

function geleden(dagen: number) {
  return new Date(Date.now() - dagen * dag).toISOString()
}

type Post = { wat: string; aantal: number }

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const uitkomst = await runAgent("opruimer", async (ctx) => {
    const { admin } = ctx
    const proef = ctx.settings.config?.dry_run !== false
    const posten: Post[] = []
    let seen = 0
    let acted = 0

    // ---------------------------------------------------------
    // 1. Afgewezen DJ-aanmeldingen
    //
    // Iemand die is afgewezen hoeft niet jarenlang in je systeem te blijven
    // staan. De foto's gaan mee uit de opslag.
    // ---------------------------------------------------------
    const leadDagen = ctx.num("rejected_lead_days", 90)
    const { data: oudeLeads } = await admin
      .from("dj_leads")
      .select("id, photo_paths")
      .eq("status", "rejected")
      .lt("reviewed_at", geleden(leadDagen))
      .limit(500)

    if (oudeLeads && oudeLeads.length > 0) {
      seen += oudeLeads.length
      posten.push({ wat: `afgewezen aanmeldingen ouder dan ${leadDagen} dagen`, aantal: oudeLeads.length })

      if (!proef && ctx.allowAction()) {
        // Eerst de bestanden, dan de regels. Andersom raak je het spoor kwijt.
        const paden = oudeLeads.flatMap((l) => {
          const p = l.photo_paths
          return Array.isArray(p) ? (p as unknown[]).filter((x): x is string => typeof x === "string") : []
        })
        if (paden.length > 0) {
          const { error } = await admin.storage.from("lead-photos").remove(paden)
          if (error) console.error("opruimer: foto's verwijderen mislukt:", error.message)
        }
        await admin
          .from("dj_leads")
          .delete()
          .in("id", oudeLeads.map((l) => l.id))
        acted += oudeLeads.length
      }
    }

    // ---------------------------------------------------------
    // 2. Verlopen claim-tokens onbruikbaar maken
    //
    // Geen bewaartermijn maar hygiëne: een token dat verlopen is hoort niet
    // meer in de database te staan. Dit gebeurt ook in de proefstand, want er
    // gaan geen gegevens verloren.
    // ---------------------------------------------------------
    const { data: verlopen } = await admin
      .from("dj_leads")
      .update({ claim_token_hash: null })
      .lt("claim_expires_at", new Date().toISOString())
      .is("claimed_at", null)
      .not("claim_token_hash", "is", null)
      .select("id")

    if (verlopen && verlopen.length > 0) {
      seen += verlopen.length
      acted += verlopen.length
      posten.push({ wat: "verlopen claim-tokens gewist", aantal: verlopen.length })
    }

    // ---------------------------------------------------------
    // 3. Oude regels uit het audit-log
    //
    // Een jaar is gebruikelijk: lang genoeg om iets terug te zoeken, niet
    // eindeloos.
    // ---------------------------------------------------------
    const auditDagen = ctx.num("audit_log_days", 365)
    const { count: auditOud } = await admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .lt("created_at", geleden(auditDagen))

    if (auditOud && auditOud > 0) {
      seen += auditOud
      posten.push({ wat: `logregels ouder dan ${auditDagen} dagen`, aantal: auditOud })
      if (!proef && ctx.allowAction()) {
        await admin.from("audit_log").delete().lt("created_at", geleden(auditDagen))
        acted += auditOud
      }
    }

    // ---------------------------------------------------------
    // 4. Oude runs en afgehandelde meldingen van de agents zelf
    // ---------------------------------------------------------
    const runDagen = ctx.num("agent_run_days", 90)
    const { count: runsOud } = await admin
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .lt("started_at", geleden(runDagen))

    if (runsOud && runsOud > 0) {
      seen += runsOud
      posten.push({ wat: `runs van agents ouder dan ${runDagen} dagen`, aantal: runsOud })
      if (!proef && ctx.allowAction()) {
        await admin.from("agent_runs").delete().lt("started_at", geleden(runDagen))
        acted += runsOud
      }
    }

    const meldingDagen = ctx.num("resolved_alert_days", 180)
    const { count: meldingenOud } = await admin
      .from("agent_alerts")
      .select("id", { count: "exact", head: true })
      .not("resolved_at", "is", null)
      .lt("resolved_at", geleden(meldingDagen))

    if (meldingenOud && meldingenOud > 0) {
      seen += meldingenOud
      posten.push({ wat: `afgevinkte meldingen ouder dan ${meldingDagen} dagen`, aantal: meldingenOud })
      if (!proef && ctx.allowAction()) {
        await admin
          .from("agent_alerts")
          .delete()
          .not("resolved_at", "is", null)
          .lt("resolved_at", geleden(meldingDagen))
        acted += meldingenOud
      }
    }

    // ---------------------------------------------------------
    // 5. Het spoor van de aanmeldspam
    //
    // Hier staan alleen domeinen in, geen adressen. Na een jaar heeft het geen
    // waarde meer voor het herkennen van een patroon.
    // ---------------------------------------------------------
    const spamDagen = ctx.num("spam_log_days", 365)
    const { count: spamOud } = await admin
      .from("spam_signup_log")
      .select("id", { count: "exact", head: true })
      .lt("removed_at", geleden(spamDagen))

    if (spamOud && spamOud > 0) {
      seen += spamOud
      posten.push({ wat: `regels aanmeldspam ouder dan ${spamDagen} dagen`, aantal: spamOud })
      if (!proef && ctx.allowAction()) {
        await admin.from("spam_signup_log").delete().lt("removed_at", geleden(spamDagen))
        acted += spamOud
      }
    }

    // ---------------------------------------------------------
    // 6. Accounts die nooit bevestigd zijn
    //
    // Iemand die zich aanmeldde, nooit op de link klikte en nooit inlogde
    // heeft geen account; dat is een halve aanmelding die blijft staan. Alleen
    // als er echt niets aan hangt.
    // ---------------------------------------------------------
    const accountDagen = ctx.num("unconfirmed_account_days", 30)
    const { data: halve } = await admin.rpc("stale_unconfirmed_users", {
      older_than_days: accountDagen,
    })

    if (halve && halve.length > 0) {
      seen += halve.length
      posten.push({ wat: `nooit bevestigde accounts ouder dan ${accountDagen} dagen`, aantal: halve.length })
      if (!proef) {
        for (const u of halve) {
          if (!ctx.allowAction()) break
          const { error } = await admin.auth.admin.deleteUser(u.id)
          if (error) {
            console.error("opruimer: account verwijderen mislukt:", error.message)
            continue
          }
          acted++
        }
      }
    }

    // ---------------------------------------------------------
    // De melding: één regel met wat er is opgeruimd, of wat er klaarstaat.
    // ---------------------------------------------------------
    const samenvatting = posten.map((p) => `${p.aantal} ${p.wat}`).join(", ")

    if (posten.length === 0) {
      await ctx.resolveGone("opruiming", [])
    } else if (proef) {
      await ctx.alert({
        key: "opruiming:voorstel",
        level: "info",
        title: "Bo staat klaar om op te ruimen",
        detail: `Dit zou hij weghalen: ${samenvatting}. Hij doet nog niets, want hij staat in de proefstand. Ben je het ermee eens, zet dan dry_run uit in zijn instellingen.`,
      })
    } else {
      await ctx.alert({
        key: `opruiming:${new Date().toISOString().slice(0, 10)}`,
        level: "info",
        title: "Opgeruimd",
        detail: samenvatting,
      })
    }

    const gemaild = await notifyOpenAlerts()
    return { seen, acted, meta: { proefstand: proef, posten, gemaild } }
  })

  return NextResponse.json(uitkomst.body, { status: uitkomst.status })
}
