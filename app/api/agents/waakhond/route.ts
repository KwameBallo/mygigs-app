import { NextResponse } from "next/server"
import { runAgent, authorizeCron } from "@/lib/agents/core"
import { notifyOpenAlerts } from "@/lib/agents/mail"

// =============================================================
// Wolf, de waakhond.
//
// Kijkt elk kwartier of er iets vastzit waar een klant last van heeft, en
// meldt dat één keer. Hij verandert zelf niets aan boekingen of betalingen:
// hij kijkt, hij meldt, en hij sluit de melding zodra het probleem weg is.
//
// Wat hij controleert:
//   1. aanvragen die te lang op antwoord wachten
//   2. betalingen die gestart zijn maar niet afgerond
//   3. betalingen en uitbetalingen die mislukt zijn
//   4. optredens die voorbij zijn maar nog niet afgerond
//   5. herinneringen die niet verstuurd zijn (de geplande taak draait niet)
//   6. reviewverzoeken die blijven liggen
//   7. agents die zelf zijn vastgelopen
// =============================================================

export const dynamic = "force-dynamic"

const uur = 3600 * 1000
const minuut = 60 * 1000

function geleden(ms: number) {
  return new Date(Date.now() - ms).toISOString()
}

function datumNL(d: string | null) {
  if (!d) return "onbekend"
  return new Date(d).toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const uitkomst = await runAgent("waakhond", async (ctx) => {
    const { admin } = ctx
    let seen = 0
    let acted = 0

    // Boekingen die al betaald zijn. Een mislukte of hangende betaalpoging op
    // zo'n boeking is geen probleem meer: de klant heeft het daarna opnieuw en
    // wél gedaan. Hiermee blijft een afgeronde boeking niet als alarm staan.
    async function alBetaald(
      bookingIds: (string | null)[],
    ): Promise<Set<string>> {
      const ids = [...new Set(bookingIds.filter((x): x is string => !!x))]
      if (ids.length === 0) return new Set<string>()
      const { data } = await admin
        .from("bookings")
        .select("id")
        .in("id", ids)
        .in("status", ["paid", "completed"])
      return new Set((data ?? []).map((b) => b.id))
    }

    // ---------------------------------------------------------
    // 1. Aanvragen die te lang wachten
    // ---------------------------------------------------------
    const stuckUren = ctx.num("stuck_booking_hours", 48)
    const { data: wachtend } = await admin
      .from("bookings")
      .select("id, created_at, event_date, city")
      .eq("status", "pending")
      .lt("created_at", geleden(stuckUren * uur))
      .order("created_at", { ascending: true })
      .limit(50)

    const wachtendKeys: string[] = []
    for (const b of wachtend ?? []) {
      seen++
      const key = `stuck_booking:${b.id}`
      wachtendKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "warn",
        title: "Aanvraag wacht te lang op antwoord",
        detail: `Aangevraagd op ${datumNL(b.created_at)} voor ${
          b.city ?? "onbekende plaats"
        }, optreden op ${datumNL(b.event_date)}. De DJ heeft nog niet gereageerd.`,
        targetType: "booking",
        targetId: b.id,
      })
      acted++
    }
    await ctx.resolveGone("stuck_booking:", wachtendKeys)

    // ---------------------------------------------------------
    // 2. Betaling gestart maar niet afgerond
    // ---------------------------------------------------------
    const betaalMinuten = ctx.num("unfinished_payment_minutes", 60)
    const { data: hangend } = await admin
      .from("payments")
      .select("id, booking_id, amount, created_at, provider")
      .eq("status", "pending")
      .lt("created_at", geleden(betaalMinuten * minuut))
      .order("created_at", { ascending: true })
      .limit(50)

    const hangendBetaald = await alBetaald(
      (hangend ?? []).map((p) => p.booking_id),
    )
    const hangendKeys: string[] = []
    for (const p of hangend ?? []) {
      // Boeking is intussen tóch betaald (nieuwe poging gelukt): geen probleem.
      if (p.booking_id && hangendBetaald.has(p.booking_id)) continue
      seen++
      const key = `payment_stuck:${p.id}`
      hangendKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "warn",
        title: "Betaling niet afgerond",
        detail: `Bedrag ${Number(p.amount).toFixed(2)} euro via ${
          p.provider ?? "onbekend"
        }, gestart op ${datumNL(p.created_at)}. Meestal een afgebroken betaling; controleer of het geld tóch is aangekomen.`,
        targetType: "booking",
        targetId: p.booking_id ?? undefined,
      })
      acted++
    }
    await ctx.resolveGone("payment_stuck:", hangendKeys)

    // ---------------------------------------------------------
    // 3. Mislukte betalingen en uitbetalingen
    // ---------------------------------------------------------
    const { data: misluktBetaling } = await admin
      .from("payments")
      .select("id, booking_id, amount, created_at")
      .eq("status", "failed")
      .gt("created_at", geleden(7 * 24 * uur))
      .limit(50)

    const misluktBetaald = await alBetaald(
      (misluktBetaling ?? []).map((p) => p.booking_id),
    )
    const misluktKeys: string[] = []
    for (const p of misluktBetaling ?? []) {
      // Boeking is daarna alsnog betaald: een mislukte poging ervoor is geen
      // probleem meer. Zo verdwijnt ook een eerdere valse melding vanzelf.
      if (p.booking_id && misluktBetaald.has(p.booking_id)) continue
      seen++
      const key = `payment_failed:${p.id}`
      misluktKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "warn",
        title: "Betaalpoging mislukt",
        detail: `Bedrag ${Number(p.amount).toFixed(2)} euro, op ${datumNL(
          p.created_at,
        )}. De klant kan opnieuw betalen; onderneem alleen actie als het blijft mislukken.`,
        targetType: "booking",
        targetId: p.booking_id ?? undefined,
      })
      acted++
    }
    await ctx.resolveGone("payment_failed:", misluktKeys)

    const { data: misluktUitbetaling } = await admin
      .from("payouts")
      .select("id, booking_id, artist_id, amount, created_at")
      .eq("status", "failed")
      .limit(50)

    const uitbetaalKeys: string[] = []
    for (const p of misluktUitbetaling ?? []) {
      seen++
      const key = `payout_failed:${p.id}`
      uitbetaalKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "critical",
        title: "Uitbetaling aan DJ mislukt",
        detail: `Bedrag ${Number(p.amount).toFixed(2)} euro, klaargezet op ${datumNL(
          p.created_at,
        )}. Zet hem zelf opnieuw klaar; een agent komt niet aan geld.`,
        targetType: "booking",
        targetId: p.booking_id ?? undefined,
      })
      acted++
    }
    await ctx.resolveGone("payout_failed:", uitbetaalKeys)

    // ---------------------------------------------------------
    // 4. Optreden voorbij, boeking nog niet afgerond
    // ---------------------------------------------------------
    const gisteren = new Date(Date.now() - 36 * uur).toISOString().slice(0, 10)
    const { data: nietAf } = await admin
      .from("bookings")
      .select("id, event_date, city, status")
      .eq("status", "accepted")
      .lt("event_date", gisteren)
      .order("event_date", { ascending: true })
      .limit(50)

    const nietAfKeys: string[] = []
    for (const b of nietAf ?? []) {
      seen++
      const key = `booking_not_closed:${b.id}`
      nietAfKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "warn",
        title: "Optreden is voorbij maar de boeking staat nog open",
        detail: `Datum ${datumNL(b.event_date)} in ${
          b.city ?? "onbekende plaats"
        }. Zolang dit open staat, gaat de uitbetaling en het reviewverzoek niet lopen.`,
        targetType: "booking",
        targetId: b.id,
      })
      acted++
    }
    await ctx.resolveGone("booking_not_closed:", nietAfKeys)

    // ---------------------------------------------------------
    // 5. Draaien de geplande taken nog?
    //
    // We kijken niet naar de planner zelf maar naar het gevolg: staat er een
    // optreden van morgen waar nog geen herinnering voor is verstuurd, ruim na
    // het moment dat de taak had moeten draaien, dan draait die taak niet.
    // ---------------------------------------------------------
    const speling = ctx.num("cron_grace_minutes", 90)
    const morgen = new Date(Date.now() + 24 * uur).toISOString().slice(0, 10)
    const { data: zonderHerinnering } = await admin
      .from("bookings")
      .select("id")
      .in("status", ["accepted", "paid"])
      .eq("event_date", morgen)
      .is("reminder_sent_at", null)
      .limit(20)

    // Pas vanaf het middaguur NL-tijd klagen, plus de speling uit de
    // instellingen. Daarvoor kan de taak simpelweg nog moeten draaien.
    const uurNL = Number(
      new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    )
    const laatGenoeg = uurNL * 60 >= 12 * 60 + speling

    const herinneringKey = "cron_missed:booking-reminders"
    if ((zonderHerinnering?.length ?? 0) > 0 && laatGenoeg) {
      seen++
      if (ctx.allowAction()) {
        await ctx.alert({
          key: herinneringKey,
          level: "critical",
          title: "Herinneringen voor morgen zijn niet verstuurd",
          detail: `${zonderHerinnering?.length} optreden(s) morgen zonder herinnering. Waarschijnlijk draait de geplande taak booking-reminders niet.`,
        })
        acted++
      }
    } else {
      await ctx.resolveGone("cron_missed:booking-reminders", [])
    }

    // ---------------------------------------------------------
    // 6. Reviewverzoeken die blijven liggen
    // ---------------------------------------------------------
    const drieDagenGeleden = new Date(Date.now() - 3 * 24 * uur)
      .toISOString()
      .slice(0, 10)
    const { data: zonderReview } = await admin
      .from("bookings")
      .select("id")
      .in("status", ["completed", "paid"])
      .lt("event_date", drieDagenGeleden)
      .is("review_request_sent_at", null)
      .limit(20)

    if ((zonderReview?.length ?? 0) > 2) {
      seen++
      if (ctx.allowAction()) {
        await ctx.alert({
          key: "cron_missed:review-requests",
          level: "warn",
          title: "Reviewverzoeken blijven liggen",
          detail: `${zonderReview?.length} afgeronde boekingen zonder reviewverzoek. Controleer de geplande taak review-requests.`,
        })
        acted++
      }
    } else {
      await ctx.resolveGone("cron_missed:review-requests", [])
    }

    // ---------------------------------------------------------
    // 7. Agents die zelf zijn vastgelopen
    // ---------------------------------------------------------
    const { data: vastgelopen } = await admin
      .from("agent_runs")
      .select("id, agent, started_at")
      .is("finished_at", null)
      .lt("started_at", geleden(30 * minuut))
      .limit(20)

    const vastKeys: string[] = []
    for (const r of vastgelopen ?? []) {
      seen++
      const key = `run_stuck:${r.id}`
      vastKeys.push(key)
      if (!ctx.allowAction()) break
      await ctx.alert({
        key,
        level: "warn",
        title: `Een run van ${r.agent} is nooit afgerond`,
        detail: `Gestart op ${datumNL(r.started_at)} en daarna niets meer. Meestal een afgebroken run; blijft dit terugkomen, dan zit er iets vast.`,
      })
      acted++
    }
    await ctx.resolveGone("run_stuck:", vastKeys)

    // ---------------------------------------------------------
    // De post: alles wat nog niet gemeld is in één bericht.
    // ---------------------------------------------------------
    const gemaild = await notifyOpenAlerts()

    return { seen, acted, meta: { gemaild } }
  })

  return NextResponse.json(uitkomst.body, { status: uitkomst.status })
}
