"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { passwordOk } from "@/lib/password"
import { cityToCoords } from "@/lib/utils/nl-cities"
import {
  LEAD_PHOTO_BUCKET,
  findClaimableLead,
  hashClaimToken,
  parseLeadPhotoPaths,
  removeLeadPhotoFolder,
  siteUrl,
} from "@/lib/dj-leads"

// Het opeisen van een kant-en-klaar profiel door de DJ zelf.
//
// Pas hier ontstaan het account en de rij in artists. Tot dit moment stond
// alles alleen in dj_leads, onzichtbaar voor de site. Elke stap controleert de
// opeislink opnieuw: een server action is een gewoon adres dat iedereen kan
// aanroepen, ook zonder de pagina.

export type ClaimError =
  | "invalid"
  | "email"
  | "password"
  | "age"
  | "terms"
  | "identity"
  | "exists"
  | "loggedInOther"
  | "hasProfile"
  | "failed"

export type ClaimState = { error?: ClaimError } | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function str(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === "string" ? v : ""
}

type Lead = NonNullable<Awaited<ReturnType<typeof findClaimableLead>>>

export async function claimProfile(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const token = str(formData, "token")
  const lead = await findClaimableLead(token)
  if (!lead || !lead.stage_name) return { error: "invalid" }

  if (formData.get("age") !== "on") return { error: "age" }
  if (formData.get("terms") !== "on") return { error: "terms" }
  if (formData.get("identity") !== "on") return { error: "identity" }
  const photoConsent = formData.get("photo") === "on"

  // Al ingelogd? Dan koppelen we aan dat account, maar alleen als het hetzelfde
  // mailadres is als waar de opeislink naartoe ging.
  const supabase = await createClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  const service = createAdminClient()
  let email: string
  let password = ""
  if (viewer) {
    if (!lead.email || viewer.email?.toLowerCase() !== lead.email.toLowerCase()) {
      return { error: "loggedInOther" }
    }
    const { data: existing } = await service
      .from("artists")
      .select("id")
      .eq("user_id", viewer.id)
      .maybeSingle()
    if (existing) return { error: "hasProfile" }
    email = lead.email
  } else {
    // Ging de link per mail, dan is dat het adres. Anders (link via een DM)
    // vult de DJ zelf een adres in, dat hij daarna nog moet bevestigen.
    email = (lead.email ?? str(formData, "email")).trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 320) return { error: "email" }
    password = str(formData, "password")
    if (!passwordOk(password)) return { error: "password" }
  }

  // De link reserveren: hij werkt maar één keer. Lukt dit niet, dan was iemand
  // anders net eerder, of is de link ondertussen vervangen.
  const hash = hashClaimToken(token)
  const { data: reserved } = await service
    .from("dj_leads")
    .update({ claim_token_hash: null })
    .eq("id", lead.id)
    .eq("claim_token_hash", hash)
    .eq("status", "approved")
    .select("id")
  if (!reserved || reserved.length === 0) return { error: "invalid" }

  const release = () =>
    service.from("dj_leads").update({ claim_token_hash: hash }).eq("id", lead.id)

  // Account aanmaken.
  let userId: string
  let createdHere = false
  let signInNow = false
  if (viewer) {
    userId = viewer.id
  } else if (lead.email) {
    // De opeislink ging naar dit adres, dus dat het van de DJ is, is al
    // bewezen. Daarom meteen bevestigd en meteen ingelogd.
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: lead.stage_name, role: "artist" },
    })
    if (error || !data.user) {
      await release()
      const exists = /already|exists|registered/i.test(error?.message ?? "")
      return { error: exists ? "exists" : "failed" }
    }
    userId = data.user.id
    createdHere = true
    signInNow = true
  } else {
    // Link via een DM: het adres is nog niet bewezen. Gewone aanmelding, met de
    // bevestigingsmail van MyGigs erachteraan.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/profile`,
        data: { full_name: lead.stage_name, role: "artist" },
      },
    })
    // Supabase zegt bij een bestaand adres niet "bestaat al" (anti-enumeratie),
    // maar geeft een gebruiker zonder identiteiten terug.
    if (error || !data.user || (data.user.identities ?? []).length === 0) {
      await release()
      return { error: error ? "failed" : "exists" }
    }
    userId = data.user.id
    createdHere = true
  }

  try {
    await buildProfile(lead, userId, email, photoConsent)
  } catch (e) {
    console.error("claim: profiel opbouwen mislukt:", e instanceof Error ? e.message : e)
    if (createdHere) await service.auth.admin.deleteUser(userId)
    await release()
    return { error: "failed" }
  }

  await logAudit({
    actorId: userId,
    action: "dj_lead.claimed",
    targetType: "dj_lead",
    targetId: lead.id,
    metadata: { photo_consent: photoConsent, via: viewer ? "existing_account" : lead.email ? "mail" : "link" },
  })

  if (signInNow) {
    await supabase.auth.signInWithPassword({ email, password })
  }
  if (viewer || signInNow) redirect("/profile?welkom=1")
  redirect("/login?message=check-email")
}

// Account, DJ-profiel, genres en foto neerzetten. Gooit een fout als iets
// misgaat, zodat claimProfile alles kan terugdraaien.
async function buildProfile(lead: Lead, userId: string, email: string, photoConsent: boolean) {
  const service = createAdminClient()
  const now = new Date().toISOString()

  // Rol: een organisator die ook DJ wordt, wordt "both". Een beheerder blijft beheerder.
  const { data: prof } = await service.from("profiles").select("role").eq("id", userId).maybeSingle()
  const role =
    prof?.role === "admin" ? "admin" : prof?.role === "booker" || prof?.role === "both" ? "both" : "artist"
  const { error: profErr } = await service
    .from("profiles")
    .upsert({ id: userId, email, full_name: lead.stage_name, role })
  if (profErr) throw new Error(`profiles: ${profErr.message}`)

  // Goedgekeurd door de beheerder, dus ook als DJ-aanvraag goedgekeurd.
  const { error: appErr } = await service.from("dj_applications").upsert(
    {
      user_id: userId,
      status: "approved",
      reviewed_by: lead.reviewed_by,
      reviewed_at: now,
      motivation: "Via de aanmeldbot",
    },
    { onConflict: "user_id" },
  )
  if (appErr) throw new Error(`dj_applications: ${appErr.message}`)

  // Foto kopiëren naar de openbare opslag, alleen met toestemming.
  let avatar: {
    avatar_url: string
    avatar_variants: Record<string, string>
    avatar_blur: string | null
    avatar_updated_at: string
  } | null = null
  const paths = parseLeadPhotoPaths(lead.photo_paths, lead.id)
  if (photoConsent && Object.keys(paths).length > 0) {
    const stamp = Date.now()
    const variants: Record<string, string> = {}
    for (const [w, path] of Object.entries(paths)) {
      const { data: file, error: dlErr } = await service.storage.from(LEAD_PHOTO_BUCKET).download(path)
      if (dlErr || !file) throw new Error(`foto downloaden: ${dlErr?.message}`)
      const ext = path.endsWith(".jpg") ? "jpg" : "webp"
      const dest = `${userId}/avatar/${stamp}-${w}.${ext}`
      const { error: upErr } = await service.storage.from("media").upload(dest, file, {
        contentType: ext === "jpg" ? "image/jpeg" : "image/webp",
        cacheControl: "31536000",
        upsert: false,
      })
      if (upErr) throw new Error(`foto uploaden: ${upErr.message}`)
      variants[w] = service.storage.from("media").getPublicUrl(dest).data.publicUrl
    }
    avatar = {
      avatar_url: variants["1200"] ?? variants["512"] ?? variants["160"],
      avatar_variants: variants,
      avatar_blur: lead.photo_blur,
      avatar_updated_at: now,
    }
  }

  // Genres: namen uit de aanmelding naar id's.
  const { data: genreRows } = await service.from("genres").select("id, name")
  const byName = new Map((genreRows ?? []).map((g) => [g.name.toLowerCase(), g.id]))
  const genreIds = lead.genres
    .map((g) => byName.get(g.toLowerCase()))
    .filter((id): id is number => typeof id === "number")

  const coords = cityToCoords(lead.home_city)
  const handle = lead.instagram_handle

  const { data: artist, error: artErr } = await service
    .from("artists")
    .insert({
      user_id: userId,
      stage_name: lead.stage_name!,
      bio: lead.bio,
      home_city: lead.home_city,
      base_gage: lead.base_gage ?? 0,
      genre_id: genreIds[0] ?? null,
      instagram_handle: handle,
      instagram_url: handle ? `https://www.instagram.com/${handle}/` : null,
      soundcloud_url: lead.soundcloud_url,
      mixcloud_url: lead.mixcloud_url,
      spotify_url: lead.spotify_url,
      lat: coords?.[0] ?? null,
      lng: coords?.[1] ?? null,
      ...(avatar ?? {}),
    })
    .select("id")
    .single()
  if (artErr || !artist) throw new Error(`artists: ${artErr?.message}`)

  if (genreIds.length > 0) {
    const { error: gErr } = await service
      .from("artist_genres")
      .insert(genreIds.map((genre_id) => ({ artist_id: artist.id, genre_id })))
    if (gErr) throw new Error(`artist_genres: ${gErr.message}`)
  }

  const { error: leadErr } = await service
    .from("dj_leads")
    .update({
      status: "claimed",
      claimed_at: now,
      artist_id: artist.id,
      photo_consent_at: avatar ? now : null,
      claim_expires_at: null,
    })
    .eq("id", lead.id)
  if (leadErr) throw new Error(`dj_leads: ${leadErr.message}`)

  // De afgeschermde kopie is niet meer nodig: weg ermee.
  await removeLeadPhotoFolder(lead.id)
}

// ------------------------------------------------------------------
// "Verwijder mijn gegevens": de DJ wil niet op MyGigs. Alles wat we van hem
// hebben gaat eruit; de rij blijft alleen bestaan als afgewezen, zonder
// persoonsgegevens, zodat het beheerscherm klopt.
// ------------------------------------------------------------------

export async function deleteMyData(formData: FormData) {
  const token = str(formData, "token")
  const lead = await findClaimableLead(token)
  if (!lead) redirect("/opeisen/verwijderd")

  const service = createAdminClient()
  await service
    .from("dj_leads")
    .update({
      status: "rejected",
      reject_reason: "Verwijderd op verzoek van de DJ",
      raw_text: null,
      raw_from: null,
      raw_subject: null,
      source_note: null,
      stage_name: null,
      email: null,
      home_city: null,
      genres: [],
      base_gage: null,
      bio: null,
      instagram_handle: null,
      soundcloud_url: null,
      mixcloud_url: null,
      spotify_url: null,
      website_url: null,
      photo_paths: null,
      photo_blur: null,
      claim_token_hash: null,
      claim_expires_at: null,
    })
    .eq("id", lead.id)
  await removeLeadPhotoFolder(lead.id)

  await logAudit({
    action: "dj_lead.deleted_by_dj",
    targetType: "dj_lead",
    targetId: lead.id,
  })

  redirect("/opeisen/verwijderd")
}
