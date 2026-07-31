"use server"

import { getI18n } from "@/lib/i18n"
import { sendSupportMessage } from "@/lib/email"
import { rateLimit, clientIpFromHeaders } from "@/lib/ratelimit"
import { dict } from "./i18n"

export type SupportState = { ok?: boolean; error?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function submitSupportMessage(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const { locale } = await getI18n()
  const f = dict[locale].form

  // Honeypot: bots vullen dit verborgen veld. Geef stil "succes" terug zodat ze
  // niet merken dat het bericht is gedropt.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { ok: true }
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100)
  const email = String(formData.get("email") ?? "").trim().slice(0, 200)
  const subject = String(formData.get("subject") ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 120)
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000)

  if (!name || !email || !message) return { error: f.errRequired }
  if (!EMAIL_RE.test(email)) return { error: f.errEmail }
  if (message.length < 10) return { error: f.errShort }

  // Rate limit per IP: max 5 berichten per uur.
  const ip = await clientIpFromHeaders()
  const { ok } = await rateLimit(ip, {
    limit: 5,
    windowSec: 3600,
    scope: "support",
  })
  if (!ok) return { error: f.errRate }

  const res = await sendSupportMessage({ name, email, subject, message })
  // skipped = geen RESEND_API_KEY (lokaal); dan tonen we toch succes.
  if (!res.ok && !res.skipped) return { error: f.errFailed }

  return { ok: true }
}
