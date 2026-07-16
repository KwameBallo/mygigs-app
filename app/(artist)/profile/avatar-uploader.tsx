"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { setArtistAvatar } from "./actions"

// Upload een profielfoto naar Storage en zet 'm als avatar op de artiest.
export function AvatarUploader({
  userId,
  initialUrl,
  initials,
}: {
  userId: string
  initialUrl: string | null
  initials: string
}) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | null) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${userId}/avatar-${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) {
        setError(upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
      await setArtistAvatar(pub.publicUrl)
      setUrl(pub.publicUrl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-xl font-semibold text-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profielfoto" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand">
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0] ?? null)
              e.target.value = ""
            }}
          />
          {busy ? "Uploaden…" : url ? "Foto wijzigen" : "Foto toevoegen"}
        </label>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  )
}
