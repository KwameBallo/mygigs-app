// Spotify-volgers ophalen via Client Credentials. Artiest-volgers zijn
// publiek, dus er is geen user-login nodig: de artiest plakt zijn Spotify-
// artiest-URL en wij halen het publieke volgersaantal op.

let cachedToken: { value: string; expiresAt: number } | null = null

export function spotifyConfigured(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET,
  )
}

export function spotifyArtistId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/artist[/:]([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return null

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })
  if (!res.ok) return null

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  }
  return cachedToken.value
}

export type SpotifyArtist = {
  followers: number
  name: string
  imageUrl: string | null
}

export async function fetchSpotifyArtist(
  url: string | null | undefined,
): Promise<SpotifyArtist | null> {
  const id = spotifyArtistId(url)
  if (!id) return null

  const token = await getToken()
  if (!token) return null

  const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    followers?: { total?: number }
    name?: string
    images?: { url: string }[]
  }
  return {
    followers: data.followers?.total ?? 0,
    name: data.name ?? "",
    imageUrl: data.images?.[0]?.url ?? null,
  }
}
