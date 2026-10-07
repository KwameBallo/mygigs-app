import "server-only"

// =============================================================
// Mollie, rechtstreeks via hun REST-API.
//
// Geen SDK. Dat is dezelfde keuze als bij Resend in lib/email.ts: het zijn drie
// aanroepen, en een afhankelijkheid die bij elke bouw meegaat en elk half jaar
// een migratie vraagt weegt daar niet tegenop.
//
// De sleutel staat in MOLLIE_API_KEY en komt nooit verder dan dit bestand.
// Begint hij met test_, dan is alles wat hier gebeurt oefengeld.
//
// Het besluit voor Mollie staat in docs/betaalprovider-keuze.md.
// =============================================================

const API = "https://api.mollie.com/v2"

function sleutel(): string | null {
  const k = process.env.MOLLIE_API_KEY?.trim()
  return k && k.length > 10 ? k : null
}

/** Is Mollie ingesteld? Zonder sleutel valt de app terug op de simulatie. */
export function mollieKlaar(): boolean {
  return sleutel() !== null
}

/** Draaien we op oefengeld? Hiermee kan het scherm een waarschuwing tonen. */
export function mollieTestmodus(): boolean {
  return sleutel()?.startsWith("test_") ?? false
}

export type MollieStatus =
  | "open"
  | "pending"
  | "authorized"
  | "paid"
  | "canceled"
  | "expired"
  | "failed"

export type MolliePayment = {
  id: string
  status: MollieStatus
  amount: { currency: string; value: string }
  method: string | null
  description: string
  metadata: Record<string, unknown> | null
  paidAt?: string
  _links?: { checkout?: { href: string } }
}

class MollieFout extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "MollieFout"
  }
}

async function verzoek<T>(
  pad: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const key = sleutel()
  if (!key) throw new MollieFout("MOLLIE_API_KEY is niet ingesteld", 0)

  const res = await fetch(`${API}${pad}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })

  const tekst = await res.text()
  if (!res.ok) {
    // De sleutel staat niet in deze melding, en dat moet zo blijven: hij komt
    // in de logboeken van Vercel terecht.
    let detail = tekst.slice(0, 500)
    try {
      const j = JSON.parse(tekst) as { detail?: string; title?: string }
      detail = j.detail ?? j.title ?? detail
    } catch {}
    throw new MollieFout(`Mollie gaf ${res.status}: ${detail}`, res.status)
  }

  return JSON.parse(tekst) as T
}

/** Bedragen gaan bij Mollie als tekst met precies twee decimalen. */
function bedrag(euro: number): string {
  return (Math.round(euro * 100) / 100).toFixed(2)
}

/**
 * Maakt een betaling aan en geeft de pagina terug waar de klant heen moet.
 *
 * De webhook is waar het echte werk gebeurt. De klant kan na het betalen zijn
 * browser sluiten, op terug drukken of zijn verbinding verliezen; de webhook
 * komt hoe dan ook. Daarom staat er in de terugkeerpagina geen enkele actie
 * die ertoe doet.
 */
export async function maakBetaling(opts: {
  bedragEur: number
  omschrijving: string
  terugUrl: string
  webhookUrl: string
  metadata: Record<string, string>
  /** Laat leeg om de klant bij Mollie te laten kiezen. */
  methode?: "ideal" | "creditcard"
  taal?: "nl_NL" | "en_GB"
}): Promise<{ id: string; checkoutUrl: string; status: MollieStatus }> {
  const betaling = await verzoek<MolliePayment>("/payments", {
    method: "POST",
    body: {
      amount: { currency: "EUR", value: bedrag(opts.bedragEur) },
      description: opts.omschrijving.slice(0, 255),
      redirectUrl: opts.terugUrl,
      webhookUrl: opts.webhookUrl,
      metadata: opts.metadata,
      ...(opts.methode ? { method: opts.methode } : {}),
      locale: opts.taal ?? "nl_NL",
    },
  })

  const checkout = betaling._links?.checkout?.href
  if (!checkout) {
    throw new MollieFout("Mollie gaf geen betaalpagina terug", 0)
  }
  return { id: betaling.id, checkoutUrl: checkout, status: betaling.status }
}

/**
 * Haalt een betaling op bij Mollie.
 *
 * Dit is de enige bron van waarheid over of er betaald is. De webhook stuurt
 * alleen een nummer mee, geen status, en zelfs als dat wel zo was zouden we
 * het niet geloven: iedereen kan onze webhook aanroepen.
 */
export async function haalBetaling(id: string): Promise<MolliePayment> {
  if (!/^tr_[A-Za-z0-9]+$/.test(id)) {
    throw new MollieFout("Dat is geen geldig betalingsnummer", 0)
  }
  return verzoek<MolliePayment>(`/payments/${id}`)
}
