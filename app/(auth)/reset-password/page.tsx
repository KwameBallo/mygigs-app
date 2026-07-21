"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { EmailOtpType } from "@supabase/supabase-js"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { useT } from "@/components/i18n-provider"
import { dict } from "./i18n"

type Phase = "checking" | "ready" | "invalid" | "saving" | "done"

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const params = useSearchParams()
  const { locale } = useT()
  const d = dict[locale]

  const [phase, setPhase] = useState<Phase>("checking")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Resetlink valideren: al een sessie (code-flow) of via token_hash.
  useEffect(() => {
    let cancelled = false
    async function verify() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) return setPhase("ready")

      const tokenHash = params.get("token_hash")
      const type = params.get("type") as EmailOtpType | null
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
        if (cancelled) return
        setPhase(error ? "invalid" : "ready")
      } else {
        setPhase("invalid")
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [params, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) return setError(d.minChars)
    setPhase("saving")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setPhase("ready")
      return
    }
    setPhase("done")
    setTimeout(() => router.push("/login"), 1800)
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            {d.heading}
          </h1>
        </div>

        {phase === "checking" && (
          <p className="text-center text-sm text-muted">{d.checking}</p>
        )}

        {phase === "invalid" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-sm text-red-300">
            <p>{d.invalidTitle}</p>
            <p className="mt-2 text-muted">{d.invalidHint}</p>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-2xl border border-brand/40 bg-brand/10 p-6 text-center text-sm">
            {d.done}
          </div>
        )}

        {(phase === "ready" || phase === "saving") && (
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.chooseLabel}</span>
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={phase === "saving"}
              className="mt-2 rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
            >
              {phase === "saving" ? d.saving : d.save}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
