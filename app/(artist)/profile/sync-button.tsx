"use client"

import { useActionState } from "react"
import { syncSocials, type SyncState } from "./sync-actions"
import { formatFollowers } from "@/lib/utils/format"

const initial: SyncState = { ok: false, message: "" }

export function SyncSocials({
  instagramFollowers,
  spotifyFollowers,
}: {
  instagramFollowers: number
  spotifyFollowers: number
}) {
  const [state, action, pending] = useActionState(syncSocials, initial)

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Volgers synchroniseren</h2>
          <p className="mt-1 text-xs text-muted">
            Haalt je actuele volgersaantal op uit Spotify en Instagram.
          </p>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-full bg-brand px-5 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-50"
          >
            {pending ? "Synchroniseren…" : "Synchroniseer nu"}
          </button>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Instagram</p>
          <p className="mt-0.5 text-lg font-semibold">
            {formatFollowers(instagramFollowers)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-muted">Spotify</p>
          <p className="mt-0.5 text-lg font-semibold">
            {formatFollowers(spotifyFollowers)}
          </p>
        </div>
      </div>

      {state.message && (
        <p
          className={`mt-3 text-xs ${
            state.ok ? "text-green-400" : "text-muted"
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  )
}
