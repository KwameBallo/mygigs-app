import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

// Schrijft een regel naar het audit-log (ISO 27002 A.8.15). Via de service-role,
// want de tabel is alleen server-side toegankelijk. Faalt nooit hard: audit-
// problemen mogen de hoofdactie niet blokkeren (best-effort logging).
export async function logAudit(entry: {
  actorId?: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from("audit_log").insert({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: (entry.metadata ?? null) as unknown as Json,
    })
    if (error) console.error("audit log insert failed:", error.message)
  } catch (e) {
    console.error("audit log error:", e)
  }
}
