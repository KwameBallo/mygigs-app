import "server-only"
import { siteUrl } from "@/lib/dj-leads"

// =============================================================
// Mollie Connect. De DJ koppelt (of maakt) zijn eigen Mollie-organisatie, zodat
// hij straks rechtstreeks uitbetaald kan worden via Delayed Routing.
//
// Flow: wij sturen de DJ naar het autorisatie-scherm van Mollie, hij logt in of
// meldt zich aan, en Mollie stuurt hem terug naar onze callback met een code.
// Die wisselen we in voor een access_token (60 min) en een refresh_token (lang
// houdbaar, staat in de aparte tabel mollie_connections).
//
// client_id en client_secret komen uit de omgeving (de Connect-app in Mollie).
// =============================================================

const AUTHORIZE = "https://my.mollie.com/oauth2/authorize"
const TOKEN = "https://api.mollie.com/oauth2/tokens"
const API = "https://api.mollie.com/v2"

export const CONNECT_SCOPES = [
  "organizations.read",
  "onboarding.read",
  "payments.read",
  "payments.write",
  "refunds.read",
  "refunds.write",
  "profiles.read",
  "balances.read",
].join(" ")

function creds(): { id: string; secret: string } | null {
  const id = process.env.MOLLIE_CLIENT_ID?.trim()
  const secret = process.env.MOLLIE_CLIENT_SECRET?.trim()
  return id && secret ? { id, secret } : null
}

/** Is Mollie Connect ingesteld? Zonder sleutels tonen we geen koppel-knop. */
export function connectKlaar(): boolean {
  return creds() !== null
}

export function redirectUri(): string {
  return `${siteUrl()}/api/connect/mollie/callback`
}

/** Het adres waar de DJ heen gaat om te koppelen. */
export function authorizeUrl(state: string): string {
  const c = creds()
  if (!c) throw new Error("Mollie Connect niet ingesteld")
  const p = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirectUri(),
    state,
    scope: CONNECT_SCOPES,
    response_type: "code",
    approval_prompt: "auto",
  })
  return `${AUTHORIZE}?${p.toString()}`
}

type Tokens = {
  access_token: string
  refresh_token: string
  scope?: string
  expires_in?: number
}

async function postToken(body: Record<string, string>): Promise<Tokens> {
  const c = creds()
  if (!c) throw new Error("Mollie Connect niet ingesteld")
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${c.id}:${c.secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  })
  const tekst = await res.text()
  if (!res.ok) throw new Error(`Mollie token ${res.status}: ${tekst.slice(0, 300)}`)
  return JSON.parse(tekst) as Tokens
}

export function exchangeCode(code: string): Promise<Tokens> {
  return postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  })
}

export function refreshTokens(refreshToken: string): Promise<Tokens> {
  return postToken({ grant_type: "refresh_token", refresh_token: refreshToken })
}

/** Het org_... nummer van de zojuist gekoppelde DJ. */
export async function getOrganizationId(accessToken: string): Promise<string | null> {
  const res = await fetch(`${API}/organizations/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) return null
  const j = (await res.json()) as { id?: string }
  return j.id ?? null
}

/** Onboardingstatus: kan deze DJ al betaald worden, en hoe ver is zijn KYC. */
export async function getOnboarding(
  accessToken: string,
): Promise<{ status: "needs-data" | "in-review" | "completed"; canReceivePayments: boolean }> {
  const res = await fetch(`${API}/onboarding/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) return { status: "needs-data", canReceivePayments: false }
  const j = (await res.json()) as { status?: string; canReceivePayments?: boolean }
  const status =
    j.status === "completed" || j.status === "in-review" ? j.status : "needs-data"
  return { status, canReceivePayments: !!j.canReceivePayments }
}
