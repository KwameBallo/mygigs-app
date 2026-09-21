"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { PasswordRules } from "@/components/password-rules"
import { PASSWORD_MIN } from "@/lib/password"
import { claimProfile, type ClaimError, type ClaimState } from "./actions"
import type { dict } from "./i18n"

type D = (typeof dict)["nl"]

const ERRORS: Record<ClaimError, keyof D> = {
  invalid: "errInvalid",
  email: "errEmail",
  password: "errPassword",
  age: "errAge",
  terms: "errTerms",
  identity: "errIdentity",
  exists: "errExists",
  loggedInOther: "errLoggedInOther",
  hasProfile: "errHasProfile",
  failed: "errFailed",
}

export function ClaimForm({
  token,
  leadEmail,
  viewerEmail,
  hasPhoto,
  d,
}: {
  token: string
  leadEmail: string | null
  viewerEmail: string | null
  hasPhoto: boolean
  d: D
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimProfile, null)
  const [password, setPassword] = useState("")

  const loggedIn = !!viewerEmail
  const otherAccount =
    loggedIn && (!leadEmail || viewerEmail!.toLowerCase() !== leadEmail.toLowerCase())

  if (otherAccount) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-200">
        {d.loggedInOther}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">{d.formTitle}</h2>
      <input type="hidden" name="token" value={token} />

      {loggedIn ? (
        <p className="text-sm text-muted">
          {d.loggedInAs} <span className="text-foreground">{viewerEmail}</span>. {d.loggedInLink}
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.emailLabel}</span>
            {leadEmail ? (
              <input value={leadEmail} readOnly className="input opacity-80" />
            ) : (
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={320}
                className="input"
              />
            )}
            <span className="text-xs text-muted">{leadEmail ? d.emailFixed : d.emailFree}</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.passwordLabel}</span>
            <input
              name="password"
              type="password"
              required
              minLength={PASSWORD_MIN}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <PasswordRules password={password} />
          </label>
        </>
      )}

      <fieldset className="flex flex-col gap-3 pt-1">
        <Check name="age">{d.checkAge}</Check>
        <Check name="terms">
          {d.checkTerms}{" "}
          <Link href="/voorwaarden" target="_blank" className="text-brand hover:underline">
            {d.terms}
          </Link>{" "}
          {d.and}{" "}
          <Link href="/privacy" target="_blank" className="text-brand hover:underline">
            {d.privacy}
          </Link>
        </Check>
        <Check name="identity">{d.checkIdentity}</Check>
        {hasPhoto && (
          <Check name="photo" optional hint={d.checkPhotoHint}>
            {d.checkPhoto}
          </Check>
        )}
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {d[ERRORS[state.error]]}
          {state.error === "exists" && (
            <>
              {" "}
              <Link href="/login" className="font-medium text-brand hover:underline">
                {d.login}
              </Link>
            </>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? d.submitting : d.submit}
      </button>
    </form>
  )
}

function Check({
  name,
  children,
  optional = false,
  hint,
}: {
  name: string
  children: React.ReactNode
  optional?: boolean
  hint?: string
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        required={!optional}
        className="mt-0.5 h-4 w-4 flex-none accent-brand"
      />
      <span>
        {children}
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  )
}
