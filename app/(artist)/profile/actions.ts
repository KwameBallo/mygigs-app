"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ACT_TYPES } from "@/lib/utils/acts"
import { PROVINCE_NAMES } from "@/lib/utils/provinces"

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
    // Artiest worden is gratis: MyGigs verdient via 7% commissie per boeking.
    const { data: created } = await supabase
      .from("artists")
      .insert({ user_id: user.id, ...fields })
      .select("id")
      .single()
    // Pas de rol ómzetten naar 'artist' als het profiel écht is aangemaakt —
    // anders krijg je een fantoom-DJ (rol=artist zonder profiel).
    if (!created) return
    // Rol is client-side niet meer wijzigbaar (kolomrechten): via service-role,
    // en alleen naar 'artist' — nooit naar 'admin'.
    const admin = createAdminClient()
    await admin.from("profiles").update({ role: "artist" }).eq("id", user.id)
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
}

// Profielfoto (avatar) instellen — verschijnt op het profiel en in de
// zoekresultaten i.p.v. de initialen.
export async function setArtistAvatar(url: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("artists")
    .update({ avatar_url: url })
    .eq("user_id", user.id)

  revalidatePath("/profile")
  revalidatePath("/discover")
}
