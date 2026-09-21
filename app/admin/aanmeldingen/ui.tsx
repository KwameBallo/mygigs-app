import Link from "next/link"
import { Logo } from "@/components/logo"
import type { Database } from "@/types/database"
import type { dict } from "./i18n"

// Kleine bouwstenen die de lijst en de detailpagina allebei gebruiken.

type D = (typeof dict)["nl"]
export type LeadStatus = Database["public"]["Enums"]["dj_lead_status"]
export type LeadSource = Database["public"]["Enums"]["dj_lead_source"]

export function AdminHeader({ d }: { d: D }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 safe-top">
      <div className="flex items-center gap-2">
        <Logo />
      </div>
      <Link
        href="/admin"
        className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
      >
        {d.backToDashboard}
      </Link>
    </header>
  )
}

const MESSAGES: Record<string, { key: keyof D; tone: "ok" | "bad" }> = {
  added: { key: "msgAdded", tone: "ok" },
  saved: { key: "msgSaved", tone: "ok" },
  approved: { key: "msgApproved", tone: "ok" },
  rejected: { key: "msgRejected", tone: "ok" },
  reopened: { key: "msgReopened", tone: "ok" },
  duplicate: { key: "msgDuplicate", tone: "bad" },
  needName: { key: "msgNeedName", tone: "bad" },
  needReason: { key: "msgNeedReason", tone: "bad" },
  needRaw: { key: "msgNeedRaw", tone: "bad" },
  needSource: { key: "msgNeedSource", tone: "bad" },
  error: { key: "msgError", tone: "bad" },
}

export function Flash({ msg, d }: { msg?: string; d: D }) {
  const m = msg ? MESSAGES[msg] : undefined
  if (!m) return null
  return (
    <div
      role="status"
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        m.tone === "ok"
          ? "border-green-500/40 bg-green-500/10 text-green-300"
          : "border-red-500/40 bg-red-500/10 text-red-300"
      }`}
    >
      {d[m.key]}
    </div>
  )
}

export function statusLabel(s: LeadStatus, d: D) {
  return {
    new: d.statusNew,
    reviewing: d.statusReviewing,
    approved: d.statusApproved,
    rejected: d.statusRejected,
    claimed: d.statusClaimed,
  }[s]
}

export function sourceLabel(s: LeadSource, d: D) {
  return {
    email: d.sourceEmail,
    instagram: d.sourceInstagram,
    form: d.sourceForm,
    manual: d.sourceManual,
  }[s]
}

export function StatusPill({ status, d }: { status: LeadStatus; d: D }) {
  const tone =
    status === "new"
      ? "border-brand/40 bg-brand/10 text-brand"
      : status === "approved" || status === "claimed"
        ? "border-green-500/40 bg-green-500/10 text-green-300"
        : status === "rejected"
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-border text-muted"
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {statusLabel(status, d)}
    </span>
  )
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  )
}
