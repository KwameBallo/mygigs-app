import { NextResponse } from "next/server"
import { runAgent, authorizeCron } from "@/lib/agents/core"
import { notifyOpenAlerts } from "@/lib/agents/mail"
import { beoordeelAanmelding } from "@/lib/ai/beoordeel-aanmelding"

// =============================================================
// Sam, de poortwachter.
//
// Kijkt naar nieuwe DJ-aanmeldingen en geeft per aanmelding een advies: groen,
// oranje of rood, met twee tot vier zinnen onderbouwing. Dat advies komt op de
// aanmelding te staan en verschijnt in het beheerscherm boven jouw knoppen.
//
// Hij keurt niets goed en wijst niets af. Dat is bewust:
//   - het plan zegt dat geen agent zelf een DJ goedkeurt
//   - de AVG wil een mens in de lus bij een besluit over een persoon
//   - en praktisch: een verkeerd rood kost je een echte DJ
//
// Bij rood krijg je een melding in het beheerscherm, zodat het niet alleen in
// de lijst blijft hangen.
// =============================================================

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const uitkomst = await runAgent("poortwachter", async (ctx) => {
    const { admin } = ctx
    let seen = 0
    let acted = 0
    let kosten = 0

    const tarieven = {
      invoer: ctx.num("prijs_invoer_eur_per_mtok", 0.92),
      uitvoer: ctx.num("prijs_uitvoer_eur_per_mtok", 4.6),
    }
    const perRun = ctx.num("max_per_run", 10)

    // Alleen aanmeldingen die nog niet beoordeeld zijn. Opnieuw laten kijken
    // doe je door advised_at leeg te maken; zo blijft het jouw keuze.
    const { data: nieuw, error } = await admin
      .from("dj_leads")
      .select(
        "id, stage_name, email, home_city, genres, base_gage, bio, instagram_handle, soundcloud_url, mixcloud_url, spotify_url, website_url, source, self_submitted, raw_text",
      )
      .in("status", ["new", "reviewing"])
      .is("advised_at", null)
      .order("received_at", { ascending: true })
      .limit(perRun)

    if (error) throw new Error(`aanmeldingen ophalen mislukt: ${error.message}`)

    for (const lead of nieuw ?? []) {
      seen++
      if (!ctx.allowAction()) break

      const oordeel = await beoordeelAanmelding(
        {
          stage_name: lead.stage_name,
          email: lead.email,
          home_city: lead.home_city,
          genres: lead.genres,
          base_gage: lead.base_gage,
          bio: lead.bio,
          instagram_handle: lead.instagram_handle,
          soundcloud_url: lead.soundcloud_url,
          mixcloud_url: lead.mixcloud_url,
          spotify_url: lead.spotify_url,
          website_url: lead.website_url,
          source: lead.source,
          self_submitted: lead.self_submitted,
          raw_text: lead.raw_text,
        },
        tarieven,
      )

      if ("fout" in oordeel) {
        // Eén mislukte beoordeling mag de rest niet tegenhouden. Blijft het
        // misgaan, dan ziet Wolf de lege adviezen en meld ik het hier.
        console.error("poortwachter: beoordelen mislukt voor", lead.id, oordeel.fout)
        await ctx.alert({
          key: "poortwachter_fout",
          level: "warn",
          title: "Sam kan aanmeldingen niet beoordelen",
          detail: oordeel.fout,
        })
        continue
      }

      kosten += oordeel.kostenEur

      const { data: geschreven } = await admin
        .from("dj_leads")
        .update({
          advice_level: oordeel.niveau,
          advice_text: oordeel.redenen.join("\n"),
          advised_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .is("advised_at", null)
        .select("id")
      if (!geschreven || geschreven.length === 0) continue

      acted++

      if (oordeel.niveau === "rood") {
        await ctx.alert({
          key: `aanmelding_verdacht:${lead.id}`,
          level: "warn",
          title: `Aanmelding van ${lead.stage_name ?? "onbekend"} ziet er niet echt uit`,
          detail: oordeel.redenen.join(" "),
          targetType: "dj_lead",
          targetId: lead.id,
        })
      }
    }

    // Een rode melding die jij hebt afgehandeld hoeft niet te blijven staan:
    // zodra de aanmelding niet meer op 'new' of 'reviewing' staat, is hij weg.
    const { data: nogOpen } = await admin
      .from("dj_leads")
      .select("id")
      .in("status", ["new", "reviewing"])
      .eq("advice_level", "rood")
      .limit(200)
    await ctx.resolveGone(
      "aanmelding_verdacht:",
      (nogOpen ?? []).map((l) => `aanmelding_verdacht:${l.id}`),
    )

    const gemaild = await notifyOpenAlerts()
    return { seen, acted, aiCostEur: kosten, meta: { gemaild } }
  })

  return NextResponse.json(uitkomst.body, { status: uitkomst.status })
}
