"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ACT_TYPES } from "@/lib/utils/acts"
import { PROVINCE_NAMES } from "@/lib/utils/provinces"
import { HOUSE_RULES_VERSION } from "@/lib/rules"

export async function saveArtistProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim()
    return v === "" ? null : v
  }

  const stage_name = String(formData.get("stage_name") ?? "").trim()
  if (!stage_name) return

  const base_gage = Math.max(0, Number(formData.get("base_gage") ?? 0)) || 0

  const actRaw = String(formData.get("act_type") ?? "dj")
  const act_type = (ACT_TYPES as string[]).includes(actRaw)
    ? (actRaw as (typeof ACT_TYPES)[number])
    : "dj"

  const genreIds = formData
    .getAll("genres")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))

  const equipment_items = formData.getAll("equipment_items").map(String)
  const has_sound = equipment_items.some((i) =>
    ["Microfoon", "Draaitafel", "Speakers", "Bass"].includes(i),
  )
  const has_light = equipment_items.includes("Verlichting")

  // Huurprijs per aangevinkt item (de DJ verhuurt z'n eigen apparatuur).
  const equipment_prices: Record<string, number> = {}
  for (const item of equipment_items) {
    const price = Math.max(0, Number(formData.get(`equip_price_${item}`) ?? 0))
    if (price > 0) equipment_prices[item] = Math.round(price)
  }

  const fields = {
    stage_name,
    base_gage,
    genre_id: genreIds[0] ?? null,
    act_type,
    province: str("province"),
    home_city: str("home_city"),
    bio: str("bio"),
    equipment: str("equipment"),
    equipment_items,
    equipment_prices,
    has_sound,
    has_light,
    instagram_url: str("instagram_url"),
    tiktok_url: str("tiktok_url"),
    spotify_url: str("spotify_url"),
    soundcloud_url: str("soundcloud_url"),
    mixcloud_url: str("mixcloud_url"),
  }

  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  let artistId: string
  if (existing) {
    await supabase.from("artists").update(fields).eq("id", existing.id)
    artistId = existing.id
  } else {
    // Alleen een goedgekeurde DJ (rol 'artist'/'both') mag een artiestprofiel
    // aanmaken. Anders kan een organisator zichzelf boekbaar maken en de
    // admin-goedkeuring omzeilen (SEC #1). De DB-policy dwingt dit ook af (0028).
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (prof?.role !== "artist" && prof?.role !== "both") return
    // Artiest worden is gratis: MyGigs verdient via 7% commissie per boeking.
    const { data: created } = await supabase
      .from("artists")
      .insert({ user_id: user.id, ...fields })
      .select("id")
      .single()
    // Pas de rol ómzetten naar 'artist' als het profiel écht is aangemaakt -
    // anders krijg je een fantoom-DJ (rol=artist zonder profiel).
    if (!created) return
    // De rol (artist/both) is al gezet bij goedkeuring van de DJ-aanvraag;
    // hier niet meer wijzigen.
    artistId = created.id
  }

  // Genres syncen (vervang de hele set).
  await supabase.from("artist_genres").delete().eq("artist_id", artistId)
  if (genreIds.length > 0) {
    await supabase
      .from("artist_genres")
      .insert(genreIds.map((gid) => ({ artist_id: artistId, genre_id: gid })))
  }

  // Prijs + bereik per provincie syncen.
  const toUpsert: { artist_id: string; province: string; gage: number }[] = []
  const toDelete: string[] = []
  for (const p of PROVINCE_NAMES) {
    const active = formData.get(`prov_${p}`) != null
    const gage = Math.max(0, Number(formData.get(`gage_${p}`) ?? 0))
    if (active && gage > 0) toUpsert.push({ artist_id: artistId, province: p, gage })
    else toDelete.push(p)
  }
  if (toUpsert.length > 0) {
    await supabase
      .from("artist_province_rates")
      .upsert(toUpsert, { onConflict: "artist_id,province" })
  }
  if (toDelete.length > 0) {
    await supabase
      .from("artist_province_rates")
      .delete()
      .eq("artist_id", artistId)
      .in("province", toDelete)
  }

  revalidatePath("/profile")
  revalidatePath("/dashboard")
  revalidatePath("/discover")
  // Ververs het scherm zichtbaar na opslaan (terug naar boven op het profiel).
  redirect("/profile?saved=1")
}

// Facturatiegegevens van de DJ opslaan. AVG/ISO: deze PII staat in een aparte
// tabel (artist_billing) met owner-only RLS; de gewone client respecteert die
// policy, dus geen service-role nodig.
export async function saveArtistBilling(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) redirect("/profile?billing=err")

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim()
    return v === "" ? null : v
  }

  const { error } = await supabase.from("artist_billing").upsert(
    {
      artist_id: artist.id,
      invoice_name: str("invoice_name"),
      invoice_address: str("invoice_address"),
      kvk_number: str("kvk_number"),
      vat_number: str("vat_number"),
      is_vat_registered: formData.get("is_vat_registered") != null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "artist_id" },
  )

  if (error) {
    console.error("saveArtistBilling failed:", error.message)
    redirect("/profile?billing=err")
  }

  revalidatePath("/profile")
  redirect("/profile?billing=ok")
}

// Profielfoto (avatar) instellen, verschijnt op het profiel en in de
// zoekresultaten i.p.v. de initialen.
type AvatarSet = { variants: Record<string, string>; blur: string }

// Slaat de drie varianten plus de vervaagde placeholder op. De client heeft de
// bestanden al naar Storage geschreven; hier controleren we alleen of het
// werkelijk onze eigen bucket is en zetten we de rij bij.
export async function setArtistAvatarSet(input: AvatarSet): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  // Alleen eigen uploads uit Supabase Storage toestaan, geen externe URL's
  // (tracking-pixels/hotlinking op een openbaar profiel). SEC #7.
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  if (!base) return false

  const allowed = ["160", "512", "1200"]
  const variants: Record<string, string> = {}
  for (const [key, url] of Object.entries(input.variants ?? {})) {
    if (!allowed.includes(key)) continue
    if (typeof url !== "string") continue
    // Het pad moet in de eigen map van deze gebruiker staan.
    if (!url.startsWith(`${base}/storage/`)) return false
    if (!url.includes(`/media/${user.id}/avatar/`)) return false
    variants[key] = url
  }
  if (Object.keys(variants).length === 0) return false

  // De placeholder is een piepklein plaatje; alles daarboven is verdacht.
  const blur =
    typeof input.blur === "string" &&
    input.blur.startsWith("data:image/jpeg;base64,") &&
    input.blur.length < 4000
      ? input.blur
      : null

  const main = variants["1200"] ?? variants["512"] ?? variants["160"]

  const { error } = await supabase
    .from("artists")
    .update({
      avatar_url: main,
      avatar_variants: variants,
      avatar_blur: blur,
      avatar_updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", user.id)

  if (error) return false

  revalidatePath("/profile")
  revalidatePath("/discover")
  return true
}

export async function setArtistAvatar(url: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Alleen een eigen upload uit Supabase Storage toestaan, geen externe URL's
  // (tracking-pixels/hotlinking op een openbaar profiel). SEC #7.
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  if (!base || !url.startsWith(`${base}/storage/`)) return

  await supabase
    .from("artists")
    .update({ avatar_url: url })
    .eq("user_id", user.id)

  revalidatePath("/profile")
  revalidatePath("/discover")
}

// Akkoord met de huisregels vastleggen. We bewaren het moment én de versie,
// zodat we bij een latere wijziging opnieuw akkoord kunnen vragen en achteraf
// kunnen laten zien welke tekst iemand heeft geaccepteerd.
export async function acceptHouseRules(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from("artists")
    .update({
      rules_accepted_at: new Date().toISOString(),
      rules_version: HOUSE_RULES_VERSION,
    } as never)
    .eq("user_id", user.id)

  if (error) return false

  revalidatePath("/profile")
  return true
}
