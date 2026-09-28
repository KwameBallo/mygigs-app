import { NextResponse } from "next/server"
import { runAgent, authorizeCron } from "@/lib/agents/core"
import { notifyOpenAlerts } from "@/lib/agents/mail"
import { sendPushToUser } from "@/lib/push"
import {
  sendGigReminder,
  sendRequestNudgeToDJ,
  sendRequestWaitingToBooker,
  sendRequestExpiredToBooker,
} from "@/lib/email"

// =============================================================
// Nova, de boekingsbewaker.
//
// Zij houdt boekingen in beweging. Twee dingen:
//
//   1. Herinneren aan een optreden: 48 uur, 24 uur en 3 uur van tevoren, naar
//      de DJ en naar de boeker. Per moment één keer, nooit dubbel.
//   2. Aanvragen die blijven liggen: de DJ porren na 4 uur, herinneren na 24
//      uur en de boeker inlichten, en na 48 uur de aanvraag sluiten zodat de
//      boeker verder kan.
//
// Grenzen, net als bij Wolf:
//   - ze komt niet aan geld; sluiten van een aanvraag die nog niet betaald is
//     is het zwaarste dat ze doet, en dat kun je uitzetten met 'auto_close'
//   - wie e-mail heeft uitgezet krijgt geen mail, alleen een melding op de
//     telefoon als die aan staat
//   - de rem uit agent_settings begrenst hoeveel ze per run doet
// =============================================================

export const dynamic = "force-dynamic"

const uur = 3600 * 1000

type Ontvanger = { email: string | null; naam: string; userId: string }

function datumTijdNL(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function datumNL(d: string | null) {
  if (!d) return "onbekend"
  return new Date(d).toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function euro(n: number | string | null) {
  const v = Number(n ?? 0)
  return `${v.toFixed(2).replace(".", ",")} euro`
}

function plaats(city: string | null, venue: string | null) {
  return [venue, city].filter(Boolean).join(", ")
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const uitkomst = await runAgent("boekingsbewaker", async (ctx) => {
    const { admin } = ctx
    let seen = 0
    let acted = 0

    // ---------------------------------------------------------
    // Wie krijgt het bericht?
    //
    // We kijken altijd eerst of iemand e-mail heeft uitgezet. Een melding op
    // de telefoon gaat wel gewoon door: die heeft hij zelf aangezet.
    // ---------------------------------------------------------
    async function profiel(userId: string | null): Promise<Ontvanger | null> {
      if (!userId) return null
      const { data } = await admin
        .from("profiles")
        .select("id, email, full_name, email_opt_out")
        .eq("id", userId)
        .maybeSingle()
      if (!data) return null
      return {
        userId: data.id,
        naam: data.full_name || "onbekend",
        email: data.email_opt_out ? null : data.email,
      }
    }

    async function dj(artistId: string | null) {
      if (!artistId) return null
      const { data } = await admin
        .from("artists")
        .select("user_id, stage_name")
        .eq("id", artistId)
        .maybeSingle()
      if (!data) return null
      const p = await profiel(data.user_id)
      return {
        stageName: data.stage_name || p?.naam || "de DJ",
        userId: data.user_id,
        email: p?.email ?? null,
      }
    }

    // =========================================================
    // 1. Herinneringen voor het optreden
    // =========================================================
    const momenten: Array<{
      uren: 48 | 24 | 3
      kolom: "reminder_48_at" | "reminder_24_at" | "reminder_3_at"
    }> = [
      { uren: 48, kolom: "reminder_48_at" },
      { uren: 24, kolom: "reminder_24_at" },
      { uren: 3, kolom: "reminder_3_at" },
    ]

    for (const moment of momenten) {
      const { data: aankomend, error } = await admin.rpc(
        "bookings_due_for_gig_reminder",
        { stage_hours: moment.uren },
      )
      if (error) throw new Error(`herinneringen ophalen mislukt: ${error.message}`)

      for (const b of aankomend ?? []) {
        seen++
        if (!ctx.allowAction()) break

        // Het moment claimen. Lukt dat niet, dan is het al verstuurd.
        //
        // Wolf kijkt naar reminder_sent_at om te zien of de herinneringen nog
        // draaien. Die vullen we bij het moment van 24 uur, zodat zijn controle
        // blijft kloppen nu de oude taak eruit is.
        const nu = new Date().toISOString()
        const velden =
          moment.uren === 48
            ? { reminder_48_at: nu }
            : moment.uren === 24
              ? { reminder_24_at: nu, reminder_sent_at: nu }
              : { reminder_3_at: nu }

        const { data: geclaimd } = await admin
          .from("bookings")
          .update(velden)
          .eq("id", b.id)
          .is(moment.kolom, null)
          .select("id")
        if (!geclaimd || geclaimd.length === 0) continue

        const artiest = await dj(b.artist_id)
        const boeker = await profiel(b.booker_id)
        const wanneer = datumTijdNL(b.starts_at)
        const waar = plaats(b.city, b.venue_name)

        if (artiest?.email) {
          await sendGigReminder({
            to: artiest.email,
            locale: "nl",
            forDj: true,
            stageHours: moment.uren,
            when: wanneer,
            place: waar,
            counterparty: boeker?.naam ?? "de organisator",
          })
        }
        if (boeker?.email) {
          await sendGigReminder({
            to: boeker.email,
            locale: "nl",
            forDj: false,
            stageHours: moment.uren,
            when: wanneer,
            place: waar,
            counterparty: artiest?.stageName ?? "je DJ",
          })
        }

        // Melding op de telefoon voor wie die aan heeft staan.
        const kop =
          moment.uren === 3
            ? "Straks is het zo ver"
            : moment.uren === 24
              ? "Morgen is het zo ver"
              : "Over twee dagen is het zo ver"
        await Promise.all([
          artiest?.userId
            ? sendPushToUser(artiest.userId, {
                title: kop,
                body: `${wanneer}${waar ? ` in ${waar}` : ""}`,
                url: "/dashboard",
              })
            : null,
          b.booker_id
            ? sendPushToUser(b.booker_id, {
                title: kop,
                body: `${wanneer}${waar ? ` in ${waar}` : ""}`,
                url: "/bookings",
              })
            : null,
        ])

        acted++
      }
    }

    // =========================================================
    // 2. Aanvragen die blijven liggen
    // =========================================================
    const porUren = ctx.num("nudge_unopened_hours", 4)
    const herinnerUren = ctx.num("remind_no_reply_hours", 24)
    const sluitUren = ctx.num("close_no_reply_hours", 48)
    const magSluiten = ctx.settings.config?.auto_close !== false

    const { data: wachtend } = await admin
      .from("bookings")
      .select(
        "id, artist_id, booker_id, created_at, event_date, start_time, city, venue_name, gage, nudge_4h_at, nudge_24h_at",
      )
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - porUren * uur).toISOString())
      .order("created_at", { ascending: true })
      .limit(100)

    for (const b of wachtend ?? []) {
      seen++
      const openUren = Math.floor(
        (Date.now() - new Date(b.created_at).getTime()) / uur,
      )

      // --- na 48 uur: sluiten ---
      if (openUren >= sluitUren) {
        if (!ctx.allowAction()) break

        const artiest = await dj(b.artist_id)
        const boeker = await profiel(b.booker_id)

        if (!magSluiten) {
          // Sluiten staat uit: dan is het iets voor jou.
          await ctx.alert({
            key: `aanvraag_verlopen:${b.id}`,
            level: "warn",
            title: "Aanvraag staat al twee dagen open",
            detail: `${artiest?.stageName ?? "De DJ"} heeft niet gereageerd op de aanvraag voor ${datumNL(b.event_date)}. Automatisch sluiten staat uit, dus deze blijft op jou wachten.`,
            targetType: "booking",
            targetId: b.id,
          })
          acted++
          continue
        }

        const { data: gesloten } = await admin
          .from("bookings")
          .update({
            status: "declined",
            // cancelled_by blijft leeg: dat veld is voor een mens (artist,
            // booker of admin). Dat Nova het deed staat in auto_declined_at.
            auto_declined_at: new Date().toISOString(),
            cancel_reason_code: "geen_reactie",
            cancel_reason: "De DJ heeft niet op tijd gereageerd op de aanvraag.",
          })
          .eq("id", b.id)
          .eq("status", "pending")
          .select("id")
        if (!gesloten || gesloten.length === 0) continue

        if (boeker?.email) {
          await sendRequestExpiredToBooker({
            to: boeker.email,
            locale: "nl",
            djName: artiest?.stageName ?? "De DJ",
            when: datumNL(b.event_date),
            place: plaats(b.city, b.venue_name),
          })
        }
        if (boeker?.userId) {
          await sendPushToUser(boeker.userId, {
            title: "Je aanvraag is afgelopen",
            body: "De DJ reageerde niet op tijd. Bekijk andere DJ's die wel kunnen.",
            url: "/discover",
          })
        }
        acted++
        continue
      }

      // --- na 24 uur: DJ herinneren en boeker inlichten ---
      if (openUren >= herinnerUren && !b.nudge_24h_at) {
        if (!ctx.allowAction()) break
        const { data: geclaimd } = await admin
          .from("bookings")
          .update({ nudge_24h_at: new Date().toISOString() })
          .eq("id", b.id)
          .is("nudge_24h_at", null)
          .select("id")
        if (!geclaimd || geclaimd.length === 0) continue

        const artiest = await dj(b.artist_id)
        const boeker = await profiel(b.booker_id)

        if (artiest?.email) {
          await sendRequestNudgeToDJ({
            to: artiest.email,
            locale: "nl",
            when: datumNL(b.event_date),
            place: plaats(b.city, b.venue_name),
            gage: euro(b.gage),
            hoursOpen: openUren,
            lastCall: true,
          })
        }
        if (artiest?.userId) {
          await sendPushToUser(artiest.userId, {
            title: "Laatste kans op deze aanvraag",
            body: "Reageer vandaag, anders sluiten we hem morgen.",
            url: "/dashboard",
          })
        }
        if (boeker?.email) {
          await sendRequestWaitingToBooker({
            to: boeker.email,
            locale: "nl",
            djName: artiest?.stageName ?? "De DJ",
            when: datumNL(b.event_date),
          })
        }
        acted++
        continue
      }

      // --- na 4 uur: DJ porren ---
      if (openUren >= porUren && !b.nudge_4h_at) {
        if (!ctx.allowAction()) break
        const { data: geclaimd } = await admin
          .from("bookings")
          .update({ nudge_4h_at: new Date().toISOString() })
          .eq("id", b.id)
          .is("nudge_4h_at", null)
          .select("id")
        if (!geclaimd || geclaimd.length === 0) continue

        const artiest = await dj(b.artist_id)
        if (artiest?.email) {
          await sendRequestNudgeToDJ({
            to: artiest.email,
            locale: "nl",
            when: datumNL(b.event_date),
            place: plaats(b.city, b.venue_name),
            gage: euro(b.gage),
            hoursOpen: openUren,
            lastCall: false,
          })
        }
        if (artiest?.userId) {
          await sendPushToUser(artiest.userId, {
            title: "Er wacht een aanvraag op je",
            body: "Een snel antwoord maakt het verschil, ook als het een nee is.",
            url: "/dashboard",
          })
        }
        acted++
      }
    }

    const gemaild = await notifyOpenAlerts()
    return { seen, acted, meta: { gemaild } }
  })

  return NextResponse.json(uitkomst.body, { status: uitkomst.status })
}
