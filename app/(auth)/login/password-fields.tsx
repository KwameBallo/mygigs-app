"use client"

import { useEffect, useRef, useState } from "react"
import { PasswordRules } from "@/components/password-rules"
import { passwordOk, PASSWORD_MIN } from "@/lib/password"

// Wachtwoordvelden met een toon/verberg-oogje. Bij aanmelden ook een
// bevestigingsveld dat live controleert of beide wachtwoorden gelijk zijn
// (blokkeert het verzenden via native form-validatie bij verschil), plus een
// vinkjeslijstje dat meeloopt terwijl je typt.
type Labels = {
  password: string
  repeat: string
  mismatch: string
  show: string
  hide: string
  /** Melding als het wachtwoord nog niet aan alle eisen voldoet. */
  incomplete: string
}

export function PasswordFields({
  isSignup,
  labels,
}: {
  isSignup: boolean
  labels: Labels
}) {
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const confirmRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const mismatch = isSignup && confirm.length > 0 && pw !== confirm
  const weak = isSignup && pw.length > 0 && !passwordOk(pw)

  useEffect(() => {
    const el = confirmRef.current
    if (!el) return
    el.setCustomValidity(mismatch ? labels.mismatch : "")
  }, [mismatch, labels.mismatch])

  // Het wachtwoordveld zelf blokkeert het verzenden zolang niet alle eisen
  // gehaald zijn. Zo hoeft de browser niet eerst naar de server om te horen
  // wat er mis is.
  useEffect(() => {
    const el = pwRef.current
    if (!el) return
    el.setCustomValidity(weak ? labels.incomplete : "")
  }, [weak, labels.incomplete])

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{labels.password}</span>
        <div className="relative">
          <input
            ref={pwRef}
            name="password"
            type={showPw ? "text" : "password"}
            required
            // Alleen bij aanmelden eisen stellen. Bij inloggen moet een
            // bestaand (mogelijk ouder en korter) wachtwoord gewoon werken.
            minLength={isSignup ? PASSWORD_MIN : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            aria-invalid={weak}
            className={`input pr-11 ${weak ? "border-amber-500/60" : ""}`}
          />
          <ToggleButton
            shown={showPw}
            onClick={() => setShowPw((s) => !s)}
            labels={labels}
          />
        </div>
        {isSignup && <PasswordRules password={pw} />}
      </label>

      {isSignup && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{labels.repeat}</span>
          <div className="relative">
            <input
              ref={confirmRef}
              name="password_confirm"
              type={showConfirm ? "text" : "password"}
              required
              minLength={PASSWORD_MIN}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
              className={`input pr-11 ${mismatch ? "border-red-500/60" : ""}`}
            />
            <ToggleButton
              shown={showConfirm}
              onClick={() => setShowConfirm((s) => !s)}
              labels={labels}
            />
          </div>
          {mismatch && (
            <span className="text-xs text-red-400">{labels.mismatch}</span>
          )}
        </label>
      )}
    </>
  )
}

function ToggleButton({
  shown,
  onClick,
  labels,
}: {
  shown: boolean
  onClick: () => void
  labels: Labels
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? labels.hide : labels.show}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition hover:text-foreground"
    >
      {shown ? (
        // Oog met streep = verbergen
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5" />
          <path d="M6.1 6.1C3.9 7.5 3 9.6 3 12c0 2.5 4 7 9 7 1.4 0 2.7-.3 3.9-.9" />
        </svg>
      ) : (
        // Open oog = tonen
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      )}
    </button>
  )
}
