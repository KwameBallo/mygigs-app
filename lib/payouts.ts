import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { maakRoute, routingKlaar } from "@/lib/mollie"
import { logAudit } from "@/lib/audit"

// =============================================================
// Uitbetalen aan de DJ (de "geldloper").
//
// De betaling komt binnen op de MyGigs-balans. Pas als het optreden geweest is
// en de boeker heeft bevestigd (of de gracetermijn is verstreken), geven we het
// DJ-deel vrij met een Mollie-route naar het gekoppelde account van de DJ. De
// commissie van MyGigs routeren we niet; die blijft vanzelf op onze balans.
//
// Alles staat uit tot MOLLIE_ROUTING_ENABLED=true (routingKlaar). Zo kan dit al
// meedraaien zonder dat er geld beweegt, tot Mollie Delayed Routing heeft
// aangezet en we getest hebben.
// =============================================================

// Dagen na het optreden waarna we ook zonder boeker-bevestiging vrijgeven, zodat
// geld nooit eindeloos vast blijft staan (Mollie routeert zelf na 90 dagen terug
// naar de platformbalans, dus ruim daarbinnen).
const RELEASE_GRACE_DAYS = 3

// Een in-behandeling-claim via routed_at mag na dit aantal minuten opnieuw, zodat
// een vastgelopen run (crash tussen claim en route) zichzelf herstelt.
const CLAIM_STALE_MIN = 15

type Result = { skipped?: true; seen: number; released: number; failed: number }

export async function releaseEligiblePayouts(max = 50): Promise<Result> {
  if (!routingKlaar()) return { skipped: true, seen: 0, released: 0, failed: 0 }

  const admin = createAdminClient()
  const graceDate = new Date(Date.now() - RELEASE_GRACE_DAYS * 86400000)
    .toISOString()
    .slice(0, 10)
  const staleIso = new Date(Date.now() - CLAIM_STALE_MIN * 60000).toISOString()
  const claimFilter = `routed_at.is.null,routed_at.lt.${staleIso}`

  const { data: cands } = await admin
    .from("payouts")
    .select(
      "id, booking_id, artist_id, amount, bookings!inner(status, event_date, booker_confirmed_at), artists!inner(mollie_organization_id, can_receive_payments)",
    )
    .eq("status", "scheduled")
    .or(claimFilter)
    .limit(max)

  let seen = 0
  let released = 0
  let failed = 0

  for (const p of cands ?? []) {
    const bk = (Array.isArray(p.bookings) ? p.bookings[0] : p.bookings) as
      | { status: string; event_date: string; booker_confirmed_at: string | null }
      | null
    const ar = (Array.isArray(p.artists) ? p.artists[0] : p.artists) as
      | { mollie_organization_id: string | null; can_receive_payments: boolean | null }
      | null
    if (!bk || !ar) continue
    const bookingId = p.booking_id
    if (!bookingId) continue

    // Niet vrijgeven bij geannuleerd of afgewezen.
    if (bk.status === "cancelled" || bk.status === "declined") continue
    // Vrijgeven zodra de boeker bevestigd heeft, of de gracetermijn verstreken is.
    const bevestigd = !!bk.booker_confirmed_at
    const grace = bk.event_date <= graceDate
    if (!bevestigd && !grace) continue
    // De DJ moet uitbetaald kunnen worden.
    if (!ar.can_receive_payments || !ar.mollie_organization_id) continue

    seen++

    // Atomische claim: zet routed_at zodat een parallelle run deze overslaat.
    const { data: claimed } = await admin
      .from("payouts")
      .update({ routed_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("status", "scheduled")
      .or(claimFilter)
      .select("id")
    if (!claimed || claimed.length === 0) continue

    // Het betalingsnummer (tr_...) van de binnengekomen betaling.
    const { data: pay } = await admin
      .from("payments")
      .select("provider_payment_id")
      .eq("booking_id", bookingId)
      .in("status", ["held", "released"])
      .not("provider_payment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const trId = pay?.provider_payment_id ?? null
    if (!trId) {
      await admin
        .from("payouts")
        .update({ status: "failed", fail_reason: "geen betalingsnummer", routed_at: null })
        .eq("id", p.id)
      failed++
      continue
    }

    try {
      const route = await maakRoute(trId, {
        bedragEur: Number(p.amount),
        omschrijving: `MyGigs uitbetaling boeking ${bookingId.slice(0, 8)}`,
        organizationId: ar.mollie_organization_id,
      })
      await admin
        .from("payouts")
        .update({ status: "paid", provider_transfer_id: route.id })
        .eq("id", p.id)
      await admin
        .from("payments")
        .update({ status: "released", route_id: route.id })
        .eq("provider_payment_id", trId)
      await admin
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId)
        .eq("status", "paid")
      await logAudit({
        action: "payout.released",
        targetType: "booking",
        targetId: String(p.booking_id),
        metadata: { amount: p.amount, route: route.id, org: ar.mollie_organization_id },
      })
      released++
    } catch (e) {
      const msg = (e as Error).message
      // 404 = betaling nog niet routable (even na 'paid'); later opnieuw proberen.
      const transient = msg.includes("404")
      await admin
        .from("payouts")
        .update(
          transient
            ? { routed_at: null }
            : { status: "failed", fail_reason: msg.slice(0, 300), routed_at: null },
        )
        .eq("id", p.id)
      if (!transient) failed++
      console.error("uitbetaling route mislukt:", p.booking_id, msg)
    }
  }

  return { seen, released, failed }
}
