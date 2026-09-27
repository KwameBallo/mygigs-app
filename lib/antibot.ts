import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

// =============================================================
// Bescherming van openbare formulieren tegen bots.
//
// Drie lagen, van goedkoop naar sterk:
//
//   1. Een verborgen veld dat een mens nooit ziet en dus nooit invult.
//      Een formulierbot vult alles in en verraadt zich meteen.
//   2. Een ondertekend tijdstip in het formulier. Wie binnen twee seconden
//      klaar is heeft niet getypt. De ondertekening voorkomt dat een bot zelf
//      een oud tijdstip verzint.
//   3. Turnstile van Cloudflare. Dit is de laag die een serieuze bot stopt.
//
// Laag 3 staat automatisch uit zolang TURNSTILE_SECRET_KEY niet is ingesteld,
// zodat het formulier blijft werken voordat Cloudflare is ingericht. Laag 1 en
// 2 werken altijd.
//
// Gebruik in een server action:
//
//   const uitslag = verifyForm(formData)
//   if (uitslag === "honeypot") { ...doe alsof het gelukt is... }
//   if (uitslag !== "ok") { ...vraag het opnieuw... }
//   if (!(await verifyTurnstile(token, ip))) { ...melding... }
// =============================================================

/** Naam van het verborgen veld. Bewust een naam die geen wachtwoordkluis vult. */
export const HONEYPOT_FIELD = "reference_code"

/** Naam van het veld met het ondertekende tijdstip. */
export const STAMP_FIELD = "form_ts"

/** Sneller dan dit is geen mens. */
const MIN_MS = 2000

/** Ouder dan dit: het formulier heeft te lang open gestaan. */
const MAX_MS = 6 * 3600 * 1000

export type FormVerdict = "ok" | "honeypot" | "fast" | "stale" | "bad"

function secret(): string {
  // FORM_SECRET is netjes, maar CRON_SECRET bestaat al en is serverkant.
  // Zonder sleutel slaan we laag 2 over; laag 1 blijft werken.
  return process.env.FORM_SECRET || process.env.CRON_SECRET || ""
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url")
}

/**
 * Maakt het ondertekende tijdstip voor het verborgen veld.
 * Aanroepen in de server component die het formulier rendert.
 */
export function formStamp(): string {
  const key = secret()
  if (!key) return ""
  const ts = String(Date.now())
  return `${ts}.${sign(ts, key)}`
}

function checkStamp(raw: string): FormVerdict {
  const key = secret()
  if (!key) return "ok"

  const dot = raw.indexOf(".")
  if (dot < 1) return "bad"
  const ts = raw.slice(0, dot)
  const mac = raw.slice(dot + 1)
  if (!/^\d{10,16}$/.test(ts)) return "bad"

  const expected = sign(ts, key)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "bad"

  const age = Date.now() - Number(ts)
  if (age < MIN_MS) return "fast"
  if (age > MAX_MS) return "stale"
  return "ok"
}

/**
 * Laag 1 en 2 in één aanroep.
 *
 * "honeypot" betekent: dit is zeker een bot. Doe dan alsof het gelukt is, dan
 * leert hij niets. Bij "fast", "stale" of "bad" kan het ook een mens met een
 * rare browser zijn; vraag het formulier dan gewoon opnieuw.
 */
export function verifyForm(formData: FormData): FormVerdict {
  const pot = String(formData.get(HONEYPOT_FIELD) ?? "").trim()
  if (pot.length > 0) return "honeypot"
  return checkStamp(String(formData.get(STAMP_FIELD) ?? ""))
}

/** Naam van het veld dat Turnstile zelf in het formulier zet. */
export const TURNSTILE_FIELD = "cf-turnstile-response"

/** Staat Turnstile aan? Zo niet, dan slaan we laag 3 over. */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

/**
 * Controleert het bewijs van Turnstile bij Cloudflare.
 *
 * Geeft true als Turnstile niet is ingesteld, zodat het formulier blijft
 * werken. Een storing bij Cloudflare laat ook door: laag 1 en 2 vangen dan op.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const key = process.env.TURNSTILE_SECRET_KEY
  if (!key) return true
  if (!token) return false

  const body = new URLSearchParams({ secret: key, response: token })
  if (ip && ip !== "unknown") body.set("remoteip", ip)

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" },
    )
    if (!res.ok) {
      console.error("turnstile: antwoord niet ok", res.status)
      return true
    }
    const data = (await res.json()) as {
      success?: boolean
      "error-codes"?: string[]
    }
    if (!data.success) {
      console.warn("turnstile geweigerd:", data["error-codes"]?.join(",") ?? "?")
    }
    return Boolean(data.success)
  } catch (e) {
    console.error("turnstile: kon niet controleren", e)
    return true
  }
}
