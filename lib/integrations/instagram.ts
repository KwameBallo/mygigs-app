// Instagram-volgers ophalen via de Graph API (Business Discovery).
// Vereist een eigen Instagram-businessaccount + Facebook-app:
//   INSTAGRAM_IG_USER_ID  = de IG-businessaccount-id die de query doet
//   INSTAGRAM_GRAPH_TOKEN = long-lived access token van die app
// De doel-artiest hoeft alleen een (zakelijk/creator) Instagram-handle te
// hebben. Zonder deze env-variabelen is de koppeling niet geconfigureerd
// en geven we netjes null terug.

export function instagramConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_IG_USER_ID && process.env.INSTAGRAM_GRAPH_TOKEN,
  )
}

export function instagramHandle(
  input: string | null | undefined,
): string | null {
  if (!input) return null
  const trimmed = input.trim()
  const urlMatch = trimmed.match(
    /instagram\.com\/([a-zA-Z0-9._]+)/,
  )
  if (urlMatch) return urlMatch[1]
  return trimmed.replace(/^@/, "").replace(/\/+$/, "") || null
}

export type InstagramProfile = {
  followers: number
  handle: string
}

export async function fetchInstagramFollowers(
  input: string | null | undefined,
): Promise<InstagramProfile | null> {
  const handle = instagramHandle(input)
  if (!handle) return null

  const igUserId = process.env.INSTAGRAM_IG_USER_ID
  const token = process.env.INSTAGRAM_GRAPH_TOKEN
  if (!igUserId || !token) return null

  const fields = `business_discovery.username(${handle}){followers_count}`
  const url =
    `https://graph.facebook.com/v21.0/${igUserId}` +
    `?fields=${encodeURIComponent(fields)}&access_token=${token}`

  const res = await fetch(url)
  if (!res.ok) return null

  const data = (await res.json()) as {
    business_discovery?: { followers_count?: number }
  }
  const followers = data.business_discovery?.followers_count
  if (typeof followers !== "number") return null

  return { followers, handle }
}
