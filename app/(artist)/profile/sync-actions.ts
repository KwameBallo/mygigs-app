"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  fetchSpotifyArtist,
  spotifyConfigured,
} from "@/lib/integrations/spotify"
import {
  fetchInstagramFollowers,
  instagramConfigured,
} from "@/lib/integrations/instagram"
import {
  fetchTiktokFollowers,
  tiktokConfigured,
} from "@/lib/integrations/tiktok"

export type SyncState = {
  ok: boolean
  message: string
}

export async function syncSocials(
  _prev: SyncState,
  _formData: FormData,
): Promise<SyncState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Niet ingelogd." }

  const { data: artist } = await supabase
    .from("artists")
    .select(
      "id, spotify_url, instagram_url, instagram_handle, tiktok_url, tiktok_handle",
    )
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) return { ok: false, message: "Geen DJ-profiel gevonden." }

  const update: {
    spotify_followers?: number
    instagram_followers?: number
    instagram_handle?: string
    tiktok_followers?: number
    tiktok_handle?: string
  } = {}
  const done: string[] = []
  const skipped: string[] = []

  const spotify = await fetchSpotifyArtist(artist.spotify_url)
  if (spotify) {
    update.spotify_followers = spotify.followers
    done.push(`Spotify (${spotify.followers.toLocaleString("nl-NL")})`)
  } else if (!spotifyConfigured()) {
    skipped.push("Spotify (koppeling niet geconfigureerd)")
  } else if (artist.spotify_url) {
    skipped.push("Spotify (kon profiel niet ophalen)")
  }

  const igInput = artist.instagram_url ?? artist.instagram_handle
  const instagram = await fetchInstagramFollowers(igInput)
  if (instagram) {
    update.instagram_followers = instagram.followers
    update.instagram_handle = instagram.handle
    done.push(`Instagram (${instagram.followers.toLocaleString("nl-NL")})`)
  } else if (!instagramConfigured()) {
    skipped.push("Instagram (koppeling niet geconfigureerd)")
  } else if (igInput) {
    skipped.push("Instagram (kon profiel niet ophalen)")
  }

  const ttInput = artist.tiktok_url ?? artist.tiktok_handle
  const tiktok = await fetchTiktokFollowers(ttInput)
  if (tiktok) {
    update.tiktok_followers = tiktok.followers
    update.tiktok_handle = tiktok.handle
    done.push(`TikTok (${tiktok.followers.toLocaleString("nl-NL")})`)
  } else if (!tiktokConfigured()) {
    skipped.push("TikTok (koppeling niet geconfigureerd)")
  } else if (ttInput) {
    skipped.push("TikTok (kon profiel niet ophalen)")
  }

  if (Object.keys(update).length > 0) {
    await supabase.from("artists").update(update).eq("id", artist.id)
    revalidatePath("/profile")
    revalidatePath("/discover")
    revalidatePath(`/artists/${artist.id}`)
  }

  if (done.length === 0) {
    return {
      ok: false,
      message:
        skipped.length > 0
          ? `Niets gesynchroniseerd: ${skipped.join(", ")}.`
          : "Vul eerst je Spotify- of Instagram-link in.",
    }
  }

  const tail = skipped.length > 0 ? ` Overgeslagen: ${skipped.join(", ")}.` : ""
  return { ok: true, message: `Gesynchroniseerd: ${done.join(", ")}.${tail}` }
}
