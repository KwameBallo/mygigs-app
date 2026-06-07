"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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
  const genreRaw = str("genre_id")
  const genre_id = genreRaw ? Number(genreRaw) : null

  const fields = {
    stage_name,
    base_gage,
    genre_id,
    home_city: str("home_city"),
    bio: str("bio"),
    equipment: str("equipment"),
    spotify_url: str("spotify_url"),
    soundcloud_url: str("soundcloud_url"),
    mixcloud_url: str("mixcloud_url"),
  }

  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from("artists").update(fields).eq("id", existing.id)
  } else {
    await supabase.from("artists").insert({ user_id: user.id, ...fields })
    await supabase
      .from("profiles")
      .update({ role: "artist" })
      .eq("id", user.id)
  }

  revalidatePath("/profile")
  revalidatePath("/dashboard")
}
