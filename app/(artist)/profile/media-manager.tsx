"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Media = { id: string; url: string; kind: string; path: string | null }

export function MediaManager({
  artistId,
  userId,
  initial,
}: {
  artistId: string
  userId: string
  initial: Media[]
}) {
  const supabase = createClient()
  const [items, setItems] = useState<Media[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith("video") ? "video" : "photo"
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = `${userId}/${Date.now()}-${safe}`
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) {
          setError(upErr.message)
          continue
        }
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
        const { data: row, error: insErr } = await supabase
          .from("artist_media")
          .insert({ artist_id: artistId, url: pub.publicUrl, path, kind })
          .select("id, url, kind, path")
          .single()
        if (insErr || !row) {
          setError(insErr?.message ?? "Opslaan mislukt")
          continue
        }
        setItems((s) => [row as Media, ...s])
      }
    } finally {
      setBusy(false)
    }
  }

  async function remove(m: Media) {
    if (m.path) await supabase.storage.from("media").remove([m.path])
    await supabase.from("artist_media").delete().eq("id", m.id)
    setItems((s) => s.filter((x) => x.id !== m.id))
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium transition hover:border-brand/50 hover:text-brand">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ""
          }}
        />
        {busy ? "Uploaden…" : "+ Foto's / video's uploaden"}
      </label>
      {error && <span className="text-xs text-red-400">{error}</span>}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface-2"
            >
              {m.kind === "video" ? (
                <video
                  src={m.url}
                  controls
                  className="aspect-square w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => remove(m)}
                aria-label="Verwijder media"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white opacity-0 transition group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
