"use client"

import { useActionState, useState } from "react"
import { createClaimLink } from "../actions"

// Maakt een opeislink om zelf te versturen, bijvoorbeeld in een Instagram-DM.
// De link komt alleen hier op het scherm; hij staat nergens opgeslagen. Een
// nieuwe link maakt de vorige ongeldig.
export function ClaimLink({
  leadId,
  labels,
}: {
  leadId: string
  labels: { create: string; creating: string; copy: string; copied: string; hint: string; error: string }
}) {
  const [state, action, pending] = useActionState(createClaimLink, null)
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={leadId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 disabled:opacity-60"
        >
          {pending ? labels.creating : labels.create}
        </button>
      </form>
      {state?.link && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3">
          <code className="break-all text-xs">{state.link}</code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.link!)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
            className="w-fit rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-black"
          >
            {copied ? labels.copied : labels.copy}
          </button>
        </div>
      )}
      {state?.error && <p className="text-xs text-red-400">{labels.error}</p>}
      <p className="text-xs text-muted">{labels.hint}</p>
    </div>
  )
}
