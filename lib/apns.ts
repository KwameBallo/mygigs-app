import "server-only"
import crypto from "node:crypto"
import http2 from "node:http2"

// Native push naar iOS via APNs (HTTP/2 + JWT, token-gebaseerd met de .p8).
// Env: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (inhoud van .p8),
// APNS_BUNDLE_ID (standaard com.mygigs.app), APNS_PRODUCTION ("false" = sandbox).
// Zonder sleutels doet dit niets, zodat de app ook zonder push blijft werken.

export function apnsReady(): boolean {
  return !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_PRIVATE_KEY
  )
}

let cached: { jwt: string; iat: number } | null = null

// Provider-token (ES256 JWT), maximaal ~1 uur geldig; we hergebruiken 50 min.
function providerToken(): string | null {
  const kid = process.env.APNS_KEY_ID
  const iss = process.env.APNS_TEAM_ID
  const key = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!kid || !iss || !key) return null

  const now = Math.floor(Date.now() / 1000)
  if (cached && now - cached.iat < 3000) return cached.jwt

  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url")
  const input = `${b64({ alg: "ES256", kid })}.${b64({ iss, iat: now })}`
  try {
    const sig = crypto
      .sign("SHA256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" })
      .toString("base64url")
    const jwt = `${input}.${sig}`
    cached = { jwt, iat: now }
    return jwt
  } catch (e) {
    console.error("APNs token signen mislukt:", (e as Error).message)
    return null
  }
}

export type ApnsPayload = { title: string; body: string; url?: string }

// Stuurt één melding naar één device-token. remove=true betekent: token is dood
// (uitgeschreven of ongeldig) en mag opgeruimd worden.
export async function sendApns(
  token: string,
  payload: ApnsPayload,
): Promise<{ ok: boolean; remove?: boolean }> {
  const jwt = providerToken()
  if (!jwt) return { ok: false }
  const topic = process.env.APNS_BUNDLE_ID || "com.mygigs.app"
  const host =
    process.env.APNS_PRODUCTION === "false"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com"

  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
    ...(payload.url ? { url: payload.url } : {}),
  })

  return new Promise((resolve) => {
    const client = http2.connect(host)
    const done = (r: { ok: boolean; remove?: boolean }) => {
      try {
        client.close()
      } catch {}
      resolve(r)
    }
    client.on("error", () => done({ ok: false }))

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "content-type": "application/json",
    })

    let status = 0
    let data = ""
    req.on("response", (h) => {
      status = Number(h[":status"]) || 0
    })
    req.on("data", (c) => {
      data += c
    })
    req.on("error", () => done({ ok: false }))
    req.on("end", () => {
      if (status === 200) return done({ ok: true })
      const remove =
        status === 410 || (status === 400 && data.includes("BadDeviceToken"))
      console.error("APNs send mislukt:", status, data.slice(0, 200))
      done({ ok: false, remove })
    })
    req.end(body)
  })
}
