import { NextResponse } from "next/server"
import { checkAdmin } from "@/app/admin/aanmeldingen/guard"
import { sendPushToUser } from "@/lib/push"

// =============================================================
// Proefmelding.
//
// Open /api/push/test terwijl je als beheerder ingelogd bent en je krijgt een
// pushbericht op elk apparaat dat je hebt aangemeld. Zo weet je zeker dat de
// hele keten werkt: sleutels, service worker, abonnement en afleveren.
//
// Alleen naar jezelf, nooit naar anderen, en alleen voor een beheerder.
// =============================================================

export const dynamic = "force-dynamic"

export async function GET() {
  const check = await checkAdmin()
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 })
  }

  await sendPushToUser(check.userId, {
    title: "MyGigs werkt",
    body: "Dit is een proefmelding. Als je dit ziet, komen meldingen binnen.",
    url: "/admin/agents",
    tag: "proef",
  })

  return NextResponse.json({ ok: true, verstuurd_naar: "jouw apparaten" })
}
