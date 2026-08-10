"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { createClient } from "@/lib/supabase/client"
import { useT } from "@/components/i18n-provider"
import { dict } from "./i18n"

type Phase = "idle" | "sending" | "sent" | "error"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const { locale } = useT()
  const d = dict[locale]

  const [email, setEmail] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase("sending")
    // De resetlink stuurt de gebruiker naar /reset-password, waar het nieuwe
    // wachtwoord wordt ingesteld. Supabase onthult niet of het adres bestaat
    // (anti-enumeratie) — daarom tonen we altijd dezelfde melding.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setPhase(error ? "error" : "sent")
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="safe-py relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            {d.heading}
          </h1>
          <p className="mt-2 text-sm text-muted">{d.intro}</p>
        </div>

        {phase === "sent" ? (
          <div className="rounded-2xl border border-brand/40 bg-brand/10 p-6 text-center text-sm">
            {d.sent}
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.emailLabel}</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
              />
            </label>
            {phase === "error" && (
              <p className="text-sm text-red-400">{d.error}</p>
            )}
            <button
              type="submit"
              disabled={phase === "sending"}
              className="mt-2 rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
            >
              {phase === "sending" ? d.sending : d.send}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-brand hover:underline">
            {d.back}
          </Link>
        </p>
      </div>
    </main>
  )
}
