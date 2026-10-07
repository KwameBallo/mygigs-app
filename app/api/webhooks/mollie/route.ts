import { NextResponse } from "next/server"
import { haalBetaling, mollieKlaar } from "@/lib/mollie"
import {
  verwerkBetaaldeBoeking,
  verwerkMislukteBetaling,
} from "@/lib/payments"

// =============================================================
// De webhook van Mollie.
//
// Dit is het enige punt in MyGigs waar we geloven dat er betaald is.
//
// Mollie stuurt hier alleen een nummer naartoe, geen bedrag en geen status.
// Dat is geen beperking maar een ontwerpkeuze van hun kant, en een goede: dit
// adres is openbaar, iedereen kan het aanroepen. Daarom halen we de betaling
// altijd zelf op bij Mollie voordat we iets doen. Wat er in dit verzoek staat
// is niets meer dan een hint over welk nummer we moeten opzoeken.
//
// Antwoorden doen we vrijwel altijd met 200, ook als er iets niet klopt.
// Mollie probeert het namelijk opnieuw bij alles wat geen 200 is, en blijft
// dat dagenlang doen. Een betaling die niet bij ons hoort moet dus geen 500
// krijgen, anders blijven ze aankloppen voor iets wat nooit gaat lukken.
//
// De uitzondering is een echte storing aan onze kant: dan wil je juist wél dat
// Mollie het straks opnieuw probeert.
// =============================================================

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!mollieKlaar()) {
    console.error("Mollie-webhook binnengekomen zonder MOLLIE_API_KEY")
    return NextResponse.json({ error: "niet ingesteld" }, { status: 500 })
  }

  // Mollie stuurt dit als formulier, niet als JSON.
  let id: string | null = null
  try {
    const body = await request.formData()
    const waarde = body.get("id")
    if (typeof waarde === "string") id = waarde
  } catch {
    // Sommige tussenliggende partijen sturen het als JSON door.
    id = null
  }

  if (!id) {
    console.error("Mollie-webhook zonder id")
    return NextResponse.json({ ok: true, genegeerd: "geen id" })
  }

  let betaling
  try {
    betaling = await haalBetaling(id)
  } catch (e) {
    const bericht = e instanceof Error ? e.message : String(e)
    // 404 betekent: dit nummer bestaat niet bij ons profiel. Opnieuw proberen
    // helpt dan niet, dus 200 zodat Mollie ophoudt.
    if (bericht.includes("404")) {
      console.error("Mollie-webhook voor onbekende betaling:", id)
      return NextResponse.json({ ok: true, genegeerd: "onbekend bij Mollie" })
    }
    // Alles anders is mogelijk een storing. Laat Mollie het straks herhalen.
    console.error("betaling ophalen bij Mollie mislukt:", bericht)
    return NextResponse.json({ error: "ophalen mislukt" }, { status: 503 })
  }

  try {
    switch (betaling.status) {
      case "paid": {
        const uitkomst = await verwerkBetaaldeBoeking({
          molliePaymentId: betaling.id,
          methode: betaling.method,
          betaaldOp: betaling.paidAt ?? null,
        })
        if (!uitkomst.ok) {
          // Hoort niet bij ons, of de boeking is weg. Een mens moet hiernaar
          // kijken, maar Mollie hoeft niet terug te komen.
          console.error("betaling niet te verwerken:", betaling.id, uitkomst.reden)
          return NextResponse.json({ ok: true, let_op: uitkomst.reden })
        }
        return NextResponse.json({ ok: true, alGedaan: uitkomst.alGedaan })
      }

      case "canceled":
      case "expired":
      case "failed": {
        await verwerkMislukteBetaling({
          molliePaymentId: betaling.id,
          status: betaling.status,
        })
        return NextResponse.json({ ok: true, status: betaling.status })
      }

      default:
        // open, pending of authorized: nog niets te doen. Mollie laat het
        // opnieuw weten zodra het verandert.
        return NextResponse.json({ ok: true, status: betaling.status })
    }
  } catch (e) {
    // Hier is iets aan onze kant stukgegaan terwijl het geld wel binnen is.
    // 503 zodat Mollie het straks opnieuw probeert; de verwerking is zo
    // gebouwd dat een tweede poging niets dubbel doet.
    console.error("webhook verwerken mislukt voor", betaling.id, e)
    return NextResponse.json({ error: "verwerken mislukt" }, { status: 503 })
  }
}

// Mollie doet soms een GET om te kijken of het adres bestaat. Antwoord netjes,
// maar doe niets: een GET mag nooit iets veranderen.
export async function GET() {
  return NextResponse.json({ ok: true })
}
