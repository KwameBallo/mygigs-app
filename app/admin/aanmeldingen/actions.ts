"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { extractDj, sanitize } from "@/lib/ai/extract-dj"
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

  const { fields, by } = await extractDj(raw, await knownGenres())

  const service = createAdminClient()
  const { data, error } = await service
    .from("dj_leads")
    .insert({
      source: "manual",
      self_submitted: selfSubmitted,
      raw_text: raw,
      source_note: sourceNote,
      ...fields,
      extracted_by: by,
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
    metadata: { extracted_by: by, self_submitted: selfSubmitted },
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

  revalidatePath(BASE)
  revalidatePath(`${BASE}/${id}`)
  redirect(`${BASE}/${id}?msg=${approving ? "approved" : "saved"}`)
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
