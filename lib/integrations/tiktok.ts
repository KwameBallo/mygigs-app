// TikTok-volgers ophalen via de TikTok Display API.
// TikTok geeft follower_count alleen vrij voor het ingelogde account
// (scope user.info.stats via Login Kit). Volledige per-artiest OAuth
// volgt later; nu lezen we het account dat hoort bij het geconfigureerde
// access token. Zonder token is de koppeling niet geconfigureerd en geven
// we netjes null terug.

export function tiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_ACCESS_TOKEN)
}

export function tiktokHandle(
  input: string | null | undefined,
): string | null {
  if (!input) return null
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/)
  if (urlMatch) return urlMatch[1]
  return trimmed.replace(/^@/, "").replace(/\/+$/, "") || null
}

export type TiktokProfile = {
  followers: number
  handle: string
}

export async function fetchTiktokFollowers(
  input: string | null | undefined,
): Promise<TiktokProfile | null> {
  const handle = tiktokHandle(input)
  if (!handle) return null

  const token = process.env.TIKTOK_ACCESS_TOKEN
  if (!token) return null

  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,display_name",
    { headers: { authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null

  const data = (await res.json()) as {
    data?: { user?: { follower_count?: number } }
  }
  const followers = data.data?.user?.follower_count
  if (typeof followers !== "number") return null

  return { followers, handle }
}
