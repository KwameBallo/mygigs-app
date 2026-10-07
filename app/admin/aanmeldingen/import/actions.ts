"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { leesLeads, MAX_RIJEN, type ImportRij } from "@/lib/leads-csv"
import { checkAdmin } from "../guard"

// =============================================================
// Een lijst DJ's in één keer in de wachtrij zetten.
//
// Twee knoppen, allebei dezelfde route: Controleren schrijft niets en laat zien
// wat er zou gebeuren, Importeren doet het daarna echt. Het lezen en
// controleren gebeurt in allebei de gevallen met dezelfde functie, zodat je
// voorbeeld niet kan afwijken van de werkelijkheid.
//
// Elke rij komt binnen op status 'new'. Niemand staat daarmee online en er
// gaat geen mail uit: goedkeuren en uitnodigen blijven losse stappen die jij
// zet. Sam kijkt er ondertussen naar en zet er zijn advies bij.
// =============================================================

const BASE = "/admin/aanmeldingen"
const MAX_TEKENS = 500_000

export type RijUitslag = ImportRij & {
  /** Reden waarom deze rij niet geïmporteerd is, als dat zo is. */
  overgeslagen?: string
}

export type ImportState = {
  fase: "leeg" | "gecontroleerd" | "gedaan"
  fout?: string
  onbekendeKolommen?: string[]
  rijen?: RijUitslag[]
  /** Hoeveel rijen er echt zijn weggeschreven. Alleen in de fase 'gedaan'. */
  toegevoegd?: number
} | null

async function requireAdmin(): Promise<string> {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")
  return check.userId
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === "string" ? v : ""
}

async function knownGenres(): Promise<string[]> {
  const service = createAdminClient()
  const { data } = await service.from("genres").select("name").order("name")
  return (data ?? []).map((g) => g.name)
}

/**
 * Kijkt welke rijen we al kennen.
 *
 * Drie plekken, en alle drie om een andere reden:
 *   - een aanmelding die nog open staat: dan zou de database hem weigeren
 *   - een aanmelding in welke staat dan ook: een afgewezen of al opgeëiste DJ
 *     wil je niet opnieuw uitnodigen, ook al laat de database dat toe
 *   - een bestaand account: die persoon zit al op MyGigs
 */
async function alBekend(rijen: ImportRij[]): Promise<Map<number, string>> {
  const service = createAdminClient()
  const uit = new Map<number, string>()

  const mails = [...new Set(rijen.map((r) => r.velden?.email).filter(Boolean))] as string[]
  const handles = [
    ...new Set(rijen.map((r) => r.velden?.instagram_handle).filter(Boolean)),
  ] as string[]

  const [leadsOpMail, leadsOpHandle, accounts] = await Promise.all([
    mails.length
      ? service.from("dj_leads").select("email, status").in("email", mails)
      : Promise.resolve({ data: [] as { email: string | null; status: string }[] }),
    handles.length
      ? service
          .from("dj_leads")
          .select("instagram_handle, status")
          .in("instagram_handle", handles)
      : Promise.resolve({ data: [] as { instagram_handle: string | null; status: string }[] }),
    mails.length
      ? service.from("profiles").select("email").in("email", mails)
      : Promise.resolve({ data: [] as { email: string | null }[] }),
  ])

  const leadMails = new Map<string, string>()
  for (const l of leadsOpMail.data ?? []) {
    if (l.email) leadMails.set(l.email.toLowerCase(), l.status)
  }
  const leadHandles = new Map<string, string>()
  for (const l of leadsOpHandle.data ?? []) {
    if (l.instagram_handle) leadHandles.set(l.instagram_handle.toLowerCase(), l.status)
  }
  const accountMails = new Set(
    (accounts.data ?? []).map((p) => p.email?.toLowerCase()).filter(Boolean) as string[],
  )

  for (const rij of rijen) {
    if (!rij.velden) continue
    const mail = rij.velden.email.toLowerCase()
    const handle = rij.velden.instagram_handle?.toLowerCase() ?? null

    if (accountMails.has(mail)) {
      uit.set(rij.regel, "heeft al een account op MyGigs")
      continue
    }
    const opMail = leadMails.get(mail)
    if (opMail) {
      uit.set(rij.regel, `staat al in de wachtrij (${opMail})`)
      continue
    }
    const opHandle = handle ? leadHandles.get(handle) : undefined
    if (opHandle) {
      uit.set(rij.regel, `instagramnaam staat al in de wachtrij (${opHandle})`)
    }
  }

  return uit
}

async function leesEnControleer(
  formData: FormData,
): Promise<{ state: ImportState } | { rijen: RijUitslag[]; onbekendeKolommen: string[] }> {
  const tekst = str(formData, "csv")
  const bron = str(formData, "source_note").trim()

  if (!tekst.trim()) {
    return { state: { fase: "leeg", fout: "Plak een lijst of kies een bestand." } }
  }
  if (tekst.length > MAX_TEKENS) {
    return {
      state: {
        fase: "leeg",
        fout: `Dit bestand is te groot. Houd het onder ${MAX_TEKENS / 1000} kB, of knip de lijst op in stukken van ${MAX_RIJEN} regels.`,
      },
    }
  }

  const gelezen = leesLeads(tekst, await knownGenres(), bron)
  if (gelezen.fout) {
    return {
      state: {
        fase: "leeg",
        fout: gelezen.fout,
        onbekendeKolommen: gelezen.onbekendeKolommen,
      },
    }
  }

  const bekend = await alBekend(gelezen.rijen)
  const rijen: RijUitslag[] = gelezen.rijen.map((r) => {
    const reden = bekend.get(r.regel)
    return reden ? { ...r, overgeslagen: reden } : r
  })

  return { rijen, onbekendeKolommen: gelezen.onbekendeKolommen }
}

// ------------------------------------------------------------------
// Eén ingang, twee knoppen.
//
// De knop bepaalt met het veld 'intent' wat er gebeurt. Alles wat niet
// letterlijk 'importeren' is, wordt behandeld als controleren. Dat is de
// veilige kant van de vergissing: bij twijfel schrijven we niets.
// ------------------------------------------------------------------

export async function verwerkImport(
  prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  return str(formData, "intent") === "importeren"
    ? importeerLeads(prev, formData)
    : controleerImport(formData)
}

async function controleerImport(formData: FormData): Promise<ImportState> {
  await requireAdmin()
  const uitkomst = await leesEnControleer(formData)
  if ("state" in uitkomst) return uitkomst.state
  return {
    fase: "gecontroleerd",
    rijen: uitkomst.rijen,
    onbekendeKolommen: uitkomst.onbekendeKolommen,
  }
}

async function importeerLeads(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const adminId = await requireAdmin()
  const uitkomst = await leesEnControleer(formData)
  if ("state" in uitkomst) return uitkomst.state

  const { rijen, onbekendeKolommen } = uitkomst
  const mee = rijen.filter((r) => r.velden && !r.overgeslagen)

  if (mee.length === 0) {
    return {
      fase: "gecontroleerd",
      rijen,
      onbekendeKolommen,
      fout: "Er is geen enkele rij die mee kan. Er is niets toegevoegd.",
    }
  }

  const nu = new Date().toISOString()
  const service = createAdminClient()

  // Rij voor rij, niet in één keer. Bij één insert zou één rij die de database
  // weigert de hele stapel laten mislukken, en dan weet je niet welke. Dit is
  // trager en dat is het waard: je ziet per regel wat er gebeurd is.
  const uitslag: RijUitslag[] = [...rijen]
  let toegevoegd = 0

  for (const rij of mee) {
    const v = rij.velden as NonNullable<ImportRij["velden"]>
    const { error } = await service.from("dj_leads").insert({
      source: "manual",
      self_submitted: false,
      status: "new",
      source_note: v.source_note,
      raw_text: `Ingelezen uit een lijst op ${nu.slice(0, 10)}. Bron: ${v.source_note}`,
      extracted_by: "csv-import",
      extracted_at: nu,
      stage_name: v.stage_name,
      email: v.email,
      home_city: v.home_city,
      base_gage: v.base_gage,
      bio: v.bio,
      instagram_handle: v.instagram_handle,
      soundcloud_url: v.soundcloud_url,
      mixcloud_url: v.mixcloud_url,
      spotify_url: v.spotify_url,
      website_url: v.website_url,
      genres: v.genres,
    })

    const plek = uitslag.findIndex((r) => r.regel === rij.regel)
    if (error) {
      // 23505 is de dubbelcontrole van de database zelf. Die kan nog toeslaan
      // tussen het controleren en het importeren door.
      const reden =
        error.code === "23505"
          ? "stond er inmiddels al in"
          : `niet opgeslagen: ${error.message}`
      if (plek >= 0) uitslag[plek] = { ...uitslag[plek], overgeslagen: reden }
      if (error.code !== "23505") {
        console.error("import dj_lead mislukt op regel", rij.regel, error.message)
      }
      continue
    }
    toegevoegd++
  }

  await logAudit({
    actorId: adminId,
    action: "dj_lead.import_csv",
    metadata: {
      regels_gelezen: rijen.length,
      toegevoegd,
      overgeslagen: rijen.length - toegevoegd,
    },
  })

  revalidatePath(BASE)
  return { fase: "gedaan", rijen: uitslag, onbekendeKolommen, toegevoegd }
}
