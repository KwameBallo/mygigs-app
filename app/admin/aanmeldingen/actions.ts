"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { extractDj, sanitize } from "@/lib/ai/extract-dj"
import { sendDjClaimMail } from "@/lib/email"
import {
  LEAD_PHOTO_BUCKET,
  LEAD_PHOTO_WIDTHS,
  claimUrl,
  leadPhotoFolder,
  newClaimToken,
  removeLeadPhotoFolder,
} from "@/lib/dj-leads"
import type { TablesUpdate } from "@/types/database"
import { checkAdmin } from "./guard"

// Alle knoppen van de DJ-wachtrij. Elke actie controleert zelf opnieuw of de
// aanroeper beheerder is: een server action is een gewoon adres dat iedereen
// kan aanroepen, ook zonder de pagina te zien.

const BASE = "/admin/aanmeldingen"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin(): Promise<string> {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")
  return check.userId
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === "string" ? v : ""
}

function leadId(formData: FormData): string {
  const id = str(formData, "id")
  if (!UUID_RE.test(id)) redirect(`${BASE}?msg=error`)
  return id
}

// Wie de velden invulde, voor de regel "Uitgelezen door" op de pagina. Deed de
// AI niet mee, dan staat de reden erbij, zodat je ziet wat er mis is zonder in
// de serverlogboeken te hoeven kijken.
function extractedByLabel(by: "ai" | "heuristic", aiProblem?: string) {
  return (aiProblem ? `${by}: ${aiProblem}` : by).slice(0, 320)
}

async function knownGenres(): Promise<string[]> {
  const service = createAdminClient()
  const { data } = await service.from("genres").select("name").order("name")
  return (data ?? []).map((g) => g.name)
}

// ------------------------------------------------------------------
// Zelf een DJ toevoegen: plakken, uitlezen, in de wachtrij.
// ------------------------------------------------------------------

export async function addManualLead(formData: FormData) {
  const adminId = await requireAdmin()

  const raw = str(formData, "raw_text").trim().slice(0, 20_000)
  const sourceNote = str(formData, "source_note").trim().slice(0, 1000)
  const selfSubmitted = formData.get("self_submitted") === "on"
  if (!raw) redirect(`${BASE}?msg=needRaw`)
  if (!sourceNote) redirect(`${BASE}?msg=needSource`)

  const { fields, by, aiProblem } = await extractDj(raw, await knownGenres())

  const service = createAdminClient()
  const { data, error } = await service
    .from("dj_leads")
    .insert({
      source: "manual",
      self_submitted: selfSubmitted,
      raw_text: raw,
      source_note: sourceNote,
      ...fields,
      extracted_by: extractedByLabel(by, aiProblem),
      extracted_at: new Date().toISOString(),
      status: "new",
    })
    .select("id")
    .single()

  if (error) {
    // 23505: er staat al een open aanmelding met dit mailadres of deze naam.
    if (error.code === "23505") redirect(`${BASE}?msg=duplicate`)
    console.error("dj_leads insert failed:", error.message)
    redirect(`${BASE}?msg=error`)
  }

  await logAudit({
    actorId: adminId,
    action: "dj_lead.add_manual",
    targetType: "dj_lead",
    targetId: data.id,
    metadata: { extracted_by: by, ai_problem: aiProblem ?? null, self_submitted: selfSubmitted },
  })

  revalidatePath(BASE)
  redirect(`${BASE}/${data.id}?msg=added`)
}

// ------------------------------------------------------------------
// Velden opslaan. Alles gaat door dezelfde controles als de bot gebruikt.
// ------------------------------------------------------------------

async function fieldsFromForm(formData: FormData) {
  const s = sanitize
  const genres = s.genres(formData.getAll("genres"), await knownGenres())
  const update: TablesUpdate<"dj_leads"> = {
    stage_name: s.text(str(formData, "stage_name"), s.MAX.stage_name),
    email: s.email(str(formData, "email")),
    home_city: s.city(str(formData, "home_city")),
    base_gage: s.gage(str(formData, "base_gage")),
    bio: s.bio(str(formData, "bio")),
    instagram_handle: s.handle(str(formData, "instagram_handle")),
    soundcloud_url: s.url(str(formData, "soundcloud_url"), ["soundcloud.com"]),
    mixcloud_url: s.url(str(formData, "mixcloud_url"), ["mixcloud.com"]),
    spotify_url: s.url(str(formData, "spotify_url"), ["spotify.com"]),
    website_url: s.url(str(formData, "website_url")),
    genres,
  }
  return update
}

export async function saveLead(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)
  const intent = str(formData, "intent") // "save" of "approve"

  const service = createAdminClient()
  const { data: lead } = await service
    .from("dj_leads")
    .select("status")
    .eq("id", id)
    .maybeSingle()
  if (!lead) redirect(`${BASE}?msg=error`)
  // Alleen open aanmeldingen zijn te bewerken. De pagina verbergt de knoppen
  // al, maar een actie is ook zonder die pagina aan te roepen.
  if (lead.status !== "new" && lead.status !== "reviewing") {
    redirect(`${BASE}/${id}?msg=error`)
  }

  const fields = await fieldsFromForm(formData)
  const approving = intent === "approve"
  if (approving && !fields.stage_name) redirect(`${BASE}/${id}?msg=needName`)

  const now = new Date().toISOString()
  const update: TablesUpdate<"dj_leads"> = {
    ...fields,
    extracted_by: "admin",
    ...(approving
      ? { status: "approved", reviewed_by: adminId, reviewed_at: now }
      : lead.status === "new"
        ? { status: "reviewing" }
        : {}),
  }

  const { error } = await service.from("dj_leads").update(update).eq("id", id)
  if (error) {
    if (error.code === "23505") redirect(`${BASE}/${id}?msg=duplicate`)
    console.error("dj_leads update failed:", error.message)
    redirect(`${BASE}/${id}?msg=error`)
  }

  await logAudit({
    actorId: adminId,
    action: approving ? "dj_lead.approve" : "dj_lead.save",
    targetType: "dj_lead",
    targetId: id,
  })

  // Bij goedkeuren meteen de opeismail sturen als we een mailadres hebben.
  // Zonder mailadres maakt de beheerder een link om zelf te versturen.
  let msg = approving ? "approved" : "saved"
  if (approving && fields.email) {
    const issued = await issueClaim(id)
    const sent = issued ? await mailClaim(id, issued) : false
    msg = sent ? "approvedMailed" : "claimMailFailed"
  }

  revalidatePath(BASE)
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?msg=${msg}`)
}

// ------------------------------------------------------------------
// Afwijzen en weer openzetten.
// ------------------------------------------------------------------

export async function rejectLead(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)
  const reason = str(formData, "reject_reason").trim().slice(0, 500)
  if (!reason) redirect(`${BASE}/${id}?msg=needReason`)

  const service = createAdminClient()
  const { error } = await service
    .from("dj_leads")
    .update({
      status: "rejected",
      reject_reason: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      claim_token_hash: null,
      claim_expires_at: null,
    })
    .eq("id", id)
    // Een opgeëist profiel wijs je niet meer af: dat is een echt account.
    .neq("status", "claimed")
  if (error) {
    console.error("dj_leads reject failed:", error.message)
    redirect(`${BASE}/${id}?msg=error`)
  }

  await logAudit({
    actorId: adminId,
    action: "dj_lead.reject",
    targetType: "dj_lead",
    targetId: id,
    metadata: { reason },
  })

  revalidatePath(BASE)
  redirect(`${BASE}/${id}?msg=rejected`)
}

export async function reopenLead(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)

  const service = createAdminClient()
  const { error } = await service
    .from("dj_leads")
    .update({
      status: "reviewing",
      reject_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      // Een uitstaande opeislink vervalt: het profiel moet eerst opnieuw worden goedgekeurd.
      claim_token_hash: null,
      claim_expires_at: null,
    })
    .eq("id", id)
    .in("status", ["rejected", "approved"])
  if (error) {
    // Ondertussen een nieuwe open aanmelding van dezelfde DJ binnengekomen.
    if (error.code === "23505") redirect(`${BASE}/${id}?msg=duplicate`)
    console.error("dj_leads reopen failed:", error.message)
    redirect(`${BASE}/${id}?msg=error`)
  }

  await logAudit({
    actorId: adminId,
    action: "dj_lead.reopen",
    targetType: "dj_lead",
    targetId: id,
  })

  revalidatePath(BASE)
  redirect(`${BASE}/${id}?msg=reopened`)
}

// ------------------------------------------------------------------
// Opnieuw uitlezen: na het aanvullen van de tekst, of als de AI de eerste
// keer niet meedeed. Overschrijft de velden met wat de bot nu vindt.
// ------------------------------------------------------------------

export async function reextractLead(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)

  const service = createAdminClient()
  const { data: lead } = await service
    .from("dj_leads")
    .select("status, raw_text")
    .eq("id", id)
    .maybeSingle()
  if (!lead || !lead.raw_text) redirect(`${BASE}/${id}?msg=error`)
  if (lead.status !== "new" && lead.status !== "reviewing") {
    redirect(`${BASE}/${id}?msg=error`)
  }

  const { fields, by, aiProblem } = await extractDj(lead.raw_text, await knownGenres())
  const { error } = await service
    .from("dj_leads")
    .update({
      ...fields,
      extracted_by: extractedByLabel(by, aiProblem),
      extracted_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) {
    if (error.code === "23505") redirect(`${BASE}/${id}?msg=duplicate`)
    console.error("dj_leads reextract failed:", error.message)
    redirect(`${BASE}/${id}?msg=error`)
  }

  await logAudit({
    actorId: adminId,
    action: "dj_lead.reextract",
    targetType: "dj_lead",
    targetId: id,
    metadata: { extracted_by: by, ai_problem: aiProblem ?? null },
  })

  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?msg=${aiProblem ? "reextractedNoAi" : "reextracted"}`)
}

// ------------------------------------------------------------------
// Foto bij een aanmelding.
//
// De browser van de beheerder snijdt de foto bij (dezelfde bijsnijder als bij
// het gewone profiel) en uploadt de drie maten rechtstreeks naar de afgeschermde
// opslag, via eenmalige uploadlinks die de server hier uitgeeft. Zo gaat de foto
// niet door een server action heen (die hebben een groottegrens) en hoeft de
// opslag geen enkele regel voor gebruikers te hebben.
// ------------------------------------------------------------------

type UploadSlot = { width: string; path: string; token: string }

export async function startLeadPhotoUpload(input: {
  id: string
  files: { width: string; ext: string }[]
}): Promise<{ ok: true; stamp: string; slots: UploadSlot[] } | { ok: false }> {
  await requireAdmin()
  if (!UUID_RE.test(input.id)) return { ok: false }

  const service = createAdminClient()
  const { data: lead } = await service
    .from("dj_leads")
    .select("status")
    .eq("id", input.id)
    .maybeSingle()
  if (!lead || lead.status === "claimed" || lead.status === "rejected") return { ok: false }

  const stamp = String(Date.now())
  const slots: UploadSlot[] = []
  for (const f of input.files) {
    if (!(LEAD_PHOTO_WIDTHS as readonly string[]).includes(f.width)) continue
    if (f.ext !== "webp" && f.ext !== "jpg") continue
    const path = `${leadPhotoFolder(input.id)}/${stamp}-${f.width}.${f.ext}`
    const { data, error } = await service.storage
      .from(LEAD_PHOTO_BUCKET)
      .createSignedUploadUrl(path)
    if (error || !data) return { ok: false }
    slots.push({ width: f.width, path, token: data.token })
  }
  if (slots.length === 0) return { ok: false }
  return { ok: true, stamp, slots }
}

export async function finishLeadPhotoUpload(input: {
  id: string
  stamp: string
  blur: string
}): Promise<{ ok: boolean }> {
  const adminId = await requireAdmin()
  if (!UUID_RE.test(input.id) || !/^\d{10,16}$/.test(input.stamp)) return { ok: false }

  // Alleen bestanden meenemen die echt in de opslag staan, met deze tijdstempel.
  const service = createAdminClient()
  const folder = leadPhotoFolder(input.id)
  const { data: files } = await service.storage.from(LEAD_PHOTO_BUCKET).list(folder)
  const paths: Record<string, string> = {}
  for (const f of files ?? []) {
    const m = f.name.match(/^(\d+)-(160|512|1200)\.(webp|jpg)$/)
    if (m && m[1] === input.stamp) paths[m[2]] = `${folder}/${f.name}`
  }
  if (Object.keys(paths).length === 0) return { ok: false }

  const blur =
    typeof input.blur === "string" &&
    input.blur.startsWith("data:image/jpeg;base64,") &&
    input.blur.length < 4000
      ? input.blur
      : null

  const { error } = await service
    .from("dj_leads")
    .update({ photo_paths: paths, photo_blur: blur })
    .eq("id", input.id)
  if (error) return { ok: false }

  // Eerdere foto's van deze aanmelding opruimen.
  await removeLeadPhotoFolder(input.id, `${input.stamp}-`)

  await logAudit({
    actorId: adminId,
    action: "dj_lead.photo",
    targetType: "dj_lead",
    targetId: input.id,
  })
  revalidatePath(`${BASE}/${input.id}`)
  return { ok: true }
}

export async function removeLeadPhoto(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)
  const service = createAdminClient()
  await service.from("dj_leads").update({ photo_paths: null, photo_blur: null }).eq("id", id)
  await removeLeadPhotoFolder(id)
  await logAudit({ actorId: adminId, action: "dj_lead.photo_remove", targetType: "dj_lead", targetId: id })
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?msg=photoRemoved`)
}

// ------------------------------------------------------------------
// Opeislink en opeismail.
//
// Elke nieuwe link maakt de vorige ongeldig: er staat maar één hash in de
// database. De link zelf bewaren we nergens.
// ------------------------------------------------------------------

async function issueClaim(id: string) {
  const service = createAdminClient()
  const { data: lead } = await service
    .from("dj_leads")
    .select("status, stage_name, email, home_city, genres, self_submitted, source_note")
    .eq("id", id)
    .maybeSingle()
  if (!lead || lead.status !== "approved" || !lead.stage_name) return null

  const { token, hash, expiresAt } = newClaimToken()
  const { error } = await service
    .from("dj_leads")
    .update({ claim_token_hash: hash, claim_expires_at: expiresAt })
    .eq("id", id)
    .eq("status", "approved")
  if (error) return null
  return { lead, token, expiresAt }
}

async function mailClaim(
  id: string,
  issued: NonNullable<Awaited<ReturnType<typeof issueClaim>>>,
): Promise<boolean> {
  const { lead, token, expiresAt } = issued
  if (!lead.email || !lead.stage_name) return false
  const res = await sendDjClaimMail({
    to: lead.email,
    stageName: lead.stage_name,
    city: lead.home_city,
    genres: lead.genres,
    claimUrl: claimUrl(token),
    selfSubmitted: lead.self_submitted,
    sourceNote: lead.source_note,
    expiresOn: new Date(expiresAt).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  })
  if (res.ok) {
    await createAdminClient()
      .from("dj_leads")
      .update({ claim_sent_at: new Date().toISOString() })
      .eq("id", id)
  }
  return res.ok
}

// Voor de knop "Maak opeislink": geeft de link één keer terug om te kopiëren,
// bijvoorbeeld voor een DM op Instagram. Via useActionState, zodat de link
// nooit in de adresbalk of in een logboek terechtkomt.
export async function createClaimLink(
  _prev: { link?: string; error?: string } | null,
  formData: FormData,
): Promise<{ link?: string; error?: string }> {
  const adminId = await requireAdmin()
  const id = str(formData, "id")
  if (!UUID_RE.test(id)) return { error: "error" }
  const issued = await issueClaim(id)
  if (!issued) return { error: "error" }
  await logAudit({ actorId: adminId, action: "dj_lead.claim_link", targetType: "dj_lead", targetId: id })
  return { link: claimUrl(issued.token) }
}

export async function sendClaimMail(formData: FormData) {
  const adminId = await requireAdmin()
  const id = leadId(formData)
  const issued = await issueClaim(id)
  if (!issued) redirect(`${BASE}/${id}?msg=error`)
  const ok = await mailClaim(id, issued)
  await logAudit({
    actorId: adminId,
    action: "dj_lead.claim_mail",
    targetType: "dj_lead",
    targetId: id,
    metadata: { sent: ok },
  })
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?msg=${ok ? "claimMailed" : "claimMailFailed"}`)
}
