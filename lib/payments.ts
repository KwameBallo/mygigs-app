import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { generateInvoicesForBooking } from "@/lib/invoicing"
import {
  sendPaymentReceipt,
  sendBookingConfirmedToDJ,
  getUserEmail,
} from "@/lib/email"
import { formatEuro, VAT_RATE } from "@/lib/utils/pricing"

// =============================================================
// Wat er gebeurt zodra er echt betaald is.
//
// Dit stond vroeger midden in payBooking, waar de boeker op een knop drukte en
// wij deden alsof er geld binnenkwam. Nu komt het nieuws van Mollie, via de
// webhook, en dus moet dit werk los staan van een ingelogde gebruiker.
//
// Drie dingen om in je hoofd te houden als je hier iets verandert:
//
// 1. Dit draait zonder sessie. Geen createClient(), geen getI18n(), geen
//    user.id. Alles wat we nodig hebben komt uit de database.
// 2. Het kan vaker dan één keer aangeroepen worden. Mollie stuurt zijn webhook
//    opnieuw als wij traag of stuk zijn, en doet dat net zo lang tot wij netjes
//    antwoorden. De betaalregel is daarom de grendel: wie die niet van pending
//    naar held krijgt, was te laat en stopt.
// 3. Mail en facturen mogen nooit de betaling tegenhouden. Die staan apart in
//    een try, want een boeking die betaald is maar geen bonnetje kreeg is een
//    klein probleem, en een betaling die niet verwerkt werd een groot.
// =============================================================

export type Afronding =
  | { ok: true; alGedaan: false; bookingId: string; uitbetaling: number }
  | { ok: true; alGedaan: true }
  | { ok: false; reden: string }

/**
 * Verwerkt een betaling die bij Mollie op 'paid' staat.
 *
 * De aanroeper heeft de status net bij Mollie zelf opgehaald; wij vertrouwen
 * hier dus op de provider en niet op iets dat uit een browser kwam.
 */
export async function verwerkBetaaldeBoeking(opts: {
  molliePaymentId: string
  methode: string | null
  betaaldOp: string | null
}): Promise<Afronding> {
  const admin = createAdminClient()

  // 1) De grendel. Alleen wie deze rij van pending naar held krijgt mag door.
  //    Een tweede webhook raakt nul rijen en stopt hier.
  const { data: geclaimd } = await admin
    .from("payments")
    .update({
      status: "held",
      provider_status: "paid",
      paid_at: opts.betaaldOp ?? new Date().toISOString(),
    })
    .eq("provider_payment_id", opts.molliePaymentId)
    .eq("status", "pending")
    .select("id, booking_id, amount")

  if (!geclaimd || geclaimd.length === 0) {
    // Bestaat de rij wel, maar stond hij al op held? Dan is dit een herhaalde
    // webhook en is alles al gebeurd. Bestaat hij helemaal niet, dan hoort
    // deze betaling niet bij ons en moeten we dat weten.
    const { data: bestaat } = await admin
      .from("payments")
      .select("id, status")
      .eq("provider_payment_id", opts.molliePaymentId)
      .maybeSingle()
    if (!bestaat) {
      return { ok: false, reden: "onbekende betaling" }
    }
    return { ok: true, alGedaan: true }
  }

  const betaling = geclaimd[0]
  const bookingId = betaling.booking_id

  // 2) De boeking op betaald zetten. Ook dit atomisch, want de DJ kan in de
  //    tussentijd geannuleerd hebben.
  const { data: boeking } = await admin
    .from("bookings")
    .select(
      "id, artist_id, booker_id, total, service_fee, status, event_date, city, venue_name, artists(stage_name, user_id)",
    )
    .eq("id", bookingId)
    .maybeSingle()

  if (!boeking) {
    console.error("betaling zonder boeking:", opts.molliePaymentId)
    return { ok: false, reden: "boeking bestaat niet" }
  }

  const { data: opBetaald } = await admin
    .from("bookings")
    .update({ status: "paid" })
    .eq("id", bookingId)
    .in("status", ["accepted", "pending"])
    .select("id")

  if (!opBetaald || opBetaald.length === 0) {
    // De boeking stond niet meer op accepted. Het geld is wel binnen, dus dit
    // moet een mens zien: terugbetalen of alsnog doorzetten is geen beslissing
    // die een webhook hoort te nemen.
    console.error(
      "betaald op een boeking die niet meer open stond:",
      bookingId,
      boeking.status,
    )
    await logAudit({
      action: "payment.op_gesloten_boeking",
      targetType: "booking",
      targetId: bookingId,
      metadata: {
        mollie: opts.molliePaymentId,
        status_boeking: boeking.status,
      },
    })
  }

  // De commissie inclusief 21% btw wordt ingehouden, gelijk aan de
  // commissiefactuur. De DJ krijgt het restant netto. Staat zo in de
  // algemene voorwaarden en daar mag dit niet van afwijken.
  const commissieInclBtw =
    Math.round(Number(boeking.service_fee ?? 0) * (1 + VAT_RATE) * 100) / 100
  const uitbetaling = Math.max(0, Number(boeking.total) - commissieInclBtw)

  // 3) Uitbetaling inplannen. De unieke index op payouts.booking_id is de
  //    achtervang tegen een dubbele rij; een botsing is hier dus geen fout.
  const { error: uitbetaalFout } = await admin.from("payouts").insert({
    artist_id: boeking.artist_id,
    booking_id: bookingId,
    amount: uitbetaling,
    status: "scheduled",
  })
  if (uitbetaalFout && uitbetaalFout.code !== "23505") {
    console.error("uitbetaling inplannen mislukt:", uitbetaalFout.message)
  }

  // 4) Facturen. Best-effort.
  try {
    await generateInvoicesForBooking(bookingId)
  } catch (e) {
    console.error("facturen aanmaken mislukt:", e)
  }

  // 5) Mails. Best-effort.
  //
  // De taal staat op nl: dit draait zonder sessie, dus de cookie van de boeker
  // is er niet. Zodra er een taalvoorkeur op het profiel staat hoort die hier.
  try {
    const locale = "nl" as const
    const artiest = Array.isArray(boeking.artists)
      ? boeking.artists[0]
      : boeking.artists
    const wanneer = new Date(boeking.event_date).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const waar = [boeking.city, boeking.venue_name].filter(Boolean).join(" · ")

    const boekerMail = await getUserEmail(boeking.booker_id)
    if (boekerMail) {
      await sendPaymentReceipt({
        to: boekerMail,
        locale,
        djName: artiest?.stage_name ?? "DJ",
        when: wanneer,
        place: waar,
        amount: formatEuro(Number(boeking.total)),
      })
    }

    const djMail = artiest?.user_id ? await getUserEmail(artiest.user_id) : null
    if (djMail) {
      await sendBookingConfirmedToDJ({
        to: djMail,
        locale,
        when: wanneer,
        place: waar,
        payout: formatEuro(uitbetaling),
      })
    }
  } catch (e) {
    console.error("betaalmails mislukt:", e)
  }

  await logAudit({
    actorId: boeking.booker_id,
    action: "payment.hold",
    targetType: "booking",
    targetId: bookingId,
    metadata: {
      bedrag: boeking.total,
      methode: opts.methode,
      uitbetaling,
      mollie: opts.molliePaymentId,
    },
  })

  return { ok: true, alGedaan: false, bookingId, uitbetaling }
}

/**
 * Een betaling die niet doorging: afgebroken, verlopen of geweigerd.
 *
 * De boeking blijft gewoon op accepted staan, want die is nooit op betaald
 * gezet. De klant kan het dus opnieuw proberen, en dat is precies wat we
 * willen.
 */
export async function verwerkMislukteBetaling(opts: {
  molliePaymentId: string
  status: string
}): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from("payments")
    .update({ status: "failed", provider_status: opts.status })
    .eq("provider_payment_id", opts.molliePaymentId)
    .eq("status", "pending")
}
