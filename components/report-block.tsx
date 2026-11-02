"use client"

import { useState, useTransition } from "react"
import { submitReport, toggleBlock } from "@/lib/moderation"

// Meld- en blokkeerknop voor UGC (Apple 1.2). Werkt op een DJ-profiel en in de
// chat. Teksten staan hier in NL en EN, dus altijd synchroon.

type Locale = "nl" | "en"
type Target = "artist" | "conversation" | "review" | "message"

const REASONS = ["inappropriate", "harassment", "spam", "scam", "other"] as const
type Reason = (typeof REASONS)[number]

const T: Record<
  Locale,
  {
    report: string
    block: string
    unblock: string
    blockedState: string
    title: string
    hint: string
    reasons: Record<Reason, string>
    details: string
    send: string
    cancel: string
    thanks: string
    confirmBlock: string
    confirmUnblock: string
  }
> = {
  nl: {
    report: "Melden",
    block: "Blokkeren",
    unblock: "Deblokkeren",
    blockedState: "Geblokkeerd",
    title: "Dit melden",
    hint: "Waarom meld je dit?",
    reasons: {
      inappropriate: "Ongepaste inhoud",
      harassment: "Intimidatie of bedreiging",
      spam: "Spam",
      scam: "Oplichting",
      other: "Anders",
    },
    details: "Toelichting (optioneel)",
    send: "Versturen",
    cancel: "Annuleren",
    thanks: "Bedankt. We bekijken je melding.",
    confirmBlock:
      "Deze gebruiker blokkeren? Jullie kunnen elkaar dan niet meer boeken of berichten.",
    confirmUnblock: "Deze gebruiker deblokkeren?",
  },
  en: {
    report: "Report",
    block: "Block",
    unblock: "Unblock",
    blockedState: "Blocked",
    title: "Report this",
    hint: "Why are you reporting this?",
    reasons: {
      inappropriate: "Inappropriate content",
      harassment: "Harassment or threats",
      spam: "Spam",
      scam: "Scam",
      other: "Other",
    },
    details: "Details (optional)",
    send: "Submit",
    cancel: "Cancel",
    thanks: "Thanks. We will review your report.",
    confirmBlock:
      "Block this user? You will not be able to book or message each other.",
    confirmUnblock: "Unblock this user?",
  },
}

export function ReportBlock({
  locale,
  targetType,
  targetId,
  reportedUserId,
  initialBlocked = false,
  showBlock = true,
}: {
  locale: Locale
  targetType: Target
  targetId: string
  reportedUserId?: string | null
  initialBlocked?: boolean
  showBlock?: boolean
}) {
  const t = T[locale] ?? T.nl
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<Reason>("inappropriate")
  const [details, setDetails] = useState("")
  const [done, setDone] = useState(false)
  const [blocked, setBlocked] = useState(initialBlocked)
  const [pending, startTransition] = useTransition()

  function send() {
    startTransition(async () => {
      await submitReport({
        targetType,
        targetId,
        reportedUserId,
        reason,
        details,
      })
      setDone(true)
    })
  }

  function onBlock() {
    const msg = blocked ? t.confirmUnblock : t.confirmBlock
    if (!window.confirm(msg)) return
    startTransition(async () => {
      if (!reportedUserId) return
      const res = await toggleBlock({ otherUserId: reportedUserId })
      setBlocked(res.blocked)
    })
  }

  return (
    <div className="relative flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setDone(false)
        }}
        className="rounded-full border border-border px-3 py-1.5 text-muted transition hover:border-red-500/50 hover:text-red-300"
      >
        {t.report}
      </button>
      {showBlock && reportedUserId && (
        <button
          type="button"
          onClick={onBlock}
          disabled={pending}
          className={`rounded-full border px-3 py-1.5 transition disabled:opacity-60 ${
            blocked
              ? "border-red-500/50 text-red-300"
              : "border-border text-muted hover:border-red-500/50 hover:text-red-300"
          }`}
        >
          {blocked ? t.blockedState : t.block}
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-9 z-20 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl">
          {done ? (
            <div className="text-sm text-muted">
              <p>{t.thanks}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-brand/50"
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted">{t.hint}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-brand"
                    />
                    {t.reasons[r]}
                  </label>
                ))}
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t.details}
                rows={2}
                maxLength={1000}
                className="input mt-3 w-full resize-none text-sm"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-brand/50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={pending}
                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
                >
                  {t.send}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
