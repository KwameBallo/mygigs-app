import { NextResponse } from "next/server"
import { releaseEligiblePayouts } from "@/lib/payouts"

// Geplande taak (de "geldloper"): geeft het DJ-deel vrij voor optredens die
// geweest en bevestigd zijn, via Mollie Delayed Routing. Beveiligd met
// CRON_SECRET (Bearer), net als de andere cron-endpoints. Doet niets zolang
// MOLLIE_ROUTING_ENABLED niet op true staat.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const res = await releaseEligiblePayouts()
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    console.error("release-escrow cron mislukt:", e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    )
  }
}
