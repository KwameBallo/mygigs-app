import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

// Gedeelde onderdelen van de aanmeldbot: opeislinks en de foto's die bij een
// aanmelding horen. Alleen voor servercode; alles loopt via de service role.

// ------------------------------------------------------------------
// Opeislinks
// ------------------------------------------------------------------

// Hoe lang een opeislink geldig blijft.
export const CLAIM_DAYS = 30

// De link bevat een willekeurige code van 32 bytes. In de database staat alleen
// de SHA-256-hash: wie de database kan lezen, kan daarmee geen profiel opeisen.
export function newClaimToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + CLAIM_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return { token, hash: hashClaimToken(token), expiresAt }
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// 32 bytes in base64url is altijd 43 tekens. Alles anders is geen echte link.
export function looksLikeClaimToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

// Staat er een geldige, niet-verlopen link uit?
export function isClaimLive(hash: string | null, expiresAt: string | null): boolean {
  return !!hash && !!expiresAt && new Date(expiresAt).getTime() > Date.now()
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.mygigs.nl"
  )
}

export function claimUrl(token: string): string {
  return `${siteUrl()}/opeisen/${token}`
}

// ------------------------------------------------------------------
// Foto's bij een aanmelding
// ------------------------------------------------------------------

// Afgeschermde opslag: niet openbaar, alleen de server kan erbij (0038).
export const LEAD_PHOTO_BUCKET = "lead-photos"
export const LEAD_PHOTO_WIDTHS = ["160", "512", "1200"] as const
export type LeadPhotoWidth = (typeof LEAD_PHOTO_WIDTHS)[number]
export type LeadPhotoPaths = Partial<Record<LeadPhotoWidth, string>>

export function leadPhotoFolder(leadId: string): string {
  return `leads/${leadId}`
}

// Leest photo_paths uit de database en laat alleen paden door die echt in de
// map van deze aanmelding staan. Zo kan een geknoeide rij nooit naar een ander
// bestand wijzen.
export function parseLeadPhotoPaths(value: unknown, leadId: string): LeadPhotoPaths {
  if (!value || typeof value !== "object") return {}
  const prefix = `${leadPhotoFolder(leadId)}/`
  const out: LeadPhotoPaths = {}
  for (const w of LEAD_PHOTO_WIDTHS) {
    const p = (value as Record<string, unknown>)[w]
    if (typeof p === "string" && p.startsWith(prefix) && !p.includes("..")) out[w] = p
  }
  return out
}

// Tijdelijke leeslinks, om de foto te tonen aan de beheerder of op de
// opeispagina. Na tien minuten werken ze niet meer.
export async function signedLeadPhotoUrls(
  paths: LeadPhotoPaths,
  seconds = 600,
): Promise<LeadPhotoPaths> {
  const entries = Object.entries(paths) as [LeadPhotoWidth, string][]
  if (entries.length === 0) return {}
  const service = createAdminClient()
  const { data } = await service.storage
    .from(LEAD_PHOTO_BUCKET)
    .createSignedUrls(entries.map(([, p]) => p), seconds)
  const out: LeadPhotoPaths = {}
  for (const [w, p] of entries) {
    const hit = data?.find((d) => d.path === p)
    if (hit?.signedUrl) out[w] = hit.signedUrl
  }
  return out
}

export async function removeLeadPhotoFolder(leadId: string, keepPrefix?: string) {
  const service = createAdminClient()
  const folder = leadPhotoFolder(leadId)
  const { data } = await service.storage.from(LEAD_PHOTO_BUCKET).list(folder)
  const stale = (data ?? [])
    .filter((f) => !keepPrefix || !f.name.startsWith(keepPrefix))
    .map((f) => `${folder}/${f.name}`)
  if (stale.length > 0) await service.storage.from(LEAD_PHOTO_BUCKET).remove(stale)
}

// ------------------------------------------------------------------
// Opzoeken bij het opeisen
// ------------------------------------------------------------------

// Zoekt de aanmelding bij een opeislink. Geeft alleen iets terug als de link
// klopt, de aanmelding goedgekeurd is en de link nog niet verlopen is.
export async function findClaimableLead(token: string) {
  if (!looksLikeClaimToken(token)) return null
  const service = createAdminClient()
  const { data } = await service
    .from("dj_leads")
    .select("*")
    .eq("claim_token_hash", hashClaimToken(token))
    .eq("status", "approved")
    .maybeSingle()
  if (!data || !isClaimLive(data.claim_token_hash, data.claim_expires_at)) return null
  return data
}
