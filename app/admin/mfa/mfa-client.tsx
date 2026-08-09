"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Labels = {
  enrollTitle: string
  enrollIntro: string
  start: string
  scan: string
  secretLabel: string
  challengeTitle: string
  challengeIntro: string
  codeLabel: string
  verify: string
  busy: string
  invalid: string
}

// Instellen (enroll) of bevestigen (challenge) van TOTP-2FA voor de admin.
export function MfaClient({
  mode,
  factorId: existingFactorId,
  labels,
}: {
  mode: "enroll" | "challenge"
  factorId: string | null
  labels: Labels
}) {
  const supabase = createClient()
  const [factorId, setFactorId] = useState(existingFactorId ?? "")
  const [qr, setQr] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  // In challenge-modus staan we meteen klaar om een code in te voeren.
  const [enrollStarted, setEnrollStarted] = useState(mode === "challenge")

  async function startEnroll() {
    setBusy(true)
    setErr("")
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
    setBusy(false)
    if (error || !data) {
      setErr(error?.message ?? labels.invalid)
      return
    }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setEnrollStarted(true)
  }

  async function verify() {
    setBusy(true)
    setErr("")
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({
      factorId,
    })
    if (cErr || !ch) {
      setBusy(false)
      setErr(cErr?.message ?? labels.invalid)
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code: code.trim(),
    })
    setBusy(false)
    if (vErr) {
      setErr(labels.invalid)
      return
    }
    window.location.href = "/admin"
  }

  const isEnroll = mode === "enroll"

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-lg font-semibold tracking-tight">
        {isEnroll ? labels.enrollTitle : labels.challengeTitle}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isEnroll ? labels.enrollIntro : labels.challengeIntro}
      </p>

      {isEnroll && !enrollStarted && (
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="mt-5 w-full rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {busy ? labels.busy : labels.start}
        </button>
      )}

      {isEnroll && enrollStarted && qr && (
        <div className="mt-5">
          <p className="mb-2 text-sm">{labels.scan}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="TOTP QR"
            className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
          />
          <p className="mt-3 text-xs text-muted">
            {labels.secretLabel}{" "}
            <code className="break-all text-foreground">{secret}</code>
          </p>
        </div>
      )}

      {enrollStarted && (
        <div className="mt-5">
          <label className="text-sm font-medium">{labels.codeLabel}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="input mt-1.5 h-11 w-full tracking-widest"
          />
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.trim().length < 6}
            className="mt-3 w-full rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
          >
            {busy ? labels.busy : labels.verify}
          </button>
        </div>
      )}
    </div>
  )
}
