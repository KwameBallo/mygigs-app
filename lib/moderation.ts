"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/ratelimit"
import { getI18n } from "@/lib/i18n"
import {
  sendReportAlertToSupport,
  sendReportConfirmation,
} from "@/lib/email"

// Server-acties voor melden en blokkeren (UGC-moderatie, Apple 1.2). Schrijven
// via de service-role zodat we niet afhankelijk zijn van kolomrechten.

const TARGETS = ["artist", "conversation", "review", "message"] as const
type Target = (typeof TARGETS)[number]

export async function submitReport(input: {
  targetType: Target
  targetId: string
  reportedUserId?: string | null
  reason: string
  details?: string | null
}): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  if (!TARGETS.includes(input.targetType)) return { ok: false }

  // Begrens meldingen tegen misbruik van de meldknop zelf.
  const rl = await rateLimit(user.id, {
    limit: 10,
    windowSec: 3600,
    scope: "report",
  })
  if (!rl.ok) return { ok: false }

  const reason = (input.reason || "other").slice(0, 100)
  const details = (input.details || "").trim().slice(0, 1000) || null

  const admin = createAdminClient()
  const { error } = await admin.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: input.reportedUserId ?? null,
    target_type: input.targetType,
    target_id: input.targetId || null,
    reason,
    details,
  })
  if (error) return { ok: false }

  // Notificaties: alert naar support + automatische bevestiging naar de melder.
  // Best-effort, mag het melden nooit laten mislukken.
  try {
    const { data: me } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle()
    let reportedName: string | undefined
    if (input.reportedUserId) {
      const { data: rp } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", input.reportedUserId)
        .maybeSingle()
      reportedName = rp?.full_name ?? rp?.email ?? undefined
    }
    const { locale } = await getI18n()
    await sendReportAlertToSupport({
      reason,
      targetType: input.targetType,
      reporterName: me?.full_name ?? me?.email ?? user.email ?? user.id.slice(0, 8),
      reportedName,
      details,
    })
    if (user.email) {
      await sendReportConfirmation({ to: user.email, locale })
    }
  } catch (e) {
    console.error("melding-notificatie mislukt:", e)
  }

  return { ok: true }
}

export async function toggleBlock(input: {
  otherUserId: string
}): Promise<{ blocked: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !input.otherUserId || input.otherUserId === user.id) {
    return { blocked: false }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", input.otherUserId)
    .limit(1)

  let blocked: boolean
  if (existing && existing.length > 0) {
    await admin
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", input.otherUserId)
    blocked = false
  } else {
    await admin
      .from("user_blocks")
      .insert({ blocker_id: user.id, blocked_id: input.otherUserId })
    blocked = true
  }

  revalidatePath("/messages")
  return { blocked }
}
