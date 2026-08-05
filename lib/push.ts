import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

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

export type PushPayload = { title: string; body: string; url?: string }

// Stuurt een melding naar alle apparaten van één gebruiker. Best-effort:
// verlopen abonnementen (404/410) worden opgeruimd.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured() || !userId) return
  const admin = createAdminClient()
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
