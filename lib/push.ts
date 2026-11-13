import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"
import { apnsReady, sendApns } from "@/lib/apns"

// Web-push met VAPID. Sleutels staan in env (VAPID_PUBLIC/PRIVATE + subject).
// Zonder sleutels doet dit niets (zodat de app ook zonder push blijft werken).
let configured = false
function ensureConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:info@mygigs.nl",
      pub,
      priv,
    )
    configured = true
  }
  return true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  /** Zelfde tag betekent: vervang de vorige melding in plaats van stapelen. */
  tag?: string
}

// Stuurt een melding naar alle apparaten van één gebruiker. Best-effort:
// verlopen abonnementen (404/410) worden opgeruimd.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!userId) return
  const admin = createAdminClient()

  // Web-push (browser / PWA).
  if (ensureConfigured()) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          )
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id)
          } else {
            console.error("push send failed:", code)
          }
        }
      }),
    )
  }

  // Native push (iOS via APNs). Dode tokens worden opgeruimd.
  if (apnsReady()) {
    const { data: tokens } = await admin
      .from("device_push_tokens")
      .select("id, token")
      .eq("user_id", userId)
      .eq("platform", "ios")

    await Promise.all(
      (tokens ?? []).map(async (t) => {
        const res = await sendApns(t.token, payload)
        if (res.remove) {
          await admin.from("device_push_tokens").delete().eq("id", t.id)
        }
      }),
    )
  }
}

// Stuurt een melding naar alle beheerders. Hiermee komt een kritieke
// agentmelding op je telefoon terecht, zonder dat je het beheerscherm open
// hoeft te hebben.
//
// Best-effort, net als hierboven: gaat dit mis, dan staat de melding nog
// steeds in /admin/agents en gaat de mail van de waakhond gewoon door. Een
// kapotte push mag nooit een agent laten vastlopen.
export async function sendPushToAdmins(payload: PushPayload) {
  if (!ensureConfigured() && !apnsReady()) return
  const admin = createAdminClient()
  const { data: beheerders } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")

  await Promise.all(
    (beheerders ?? []).map((b) => sendPushToUser(b.id, payload)),
  )
}
