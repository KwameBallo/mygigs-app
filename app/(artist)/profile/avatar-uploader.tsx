"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { setArtistAvatarSet } from "./actions"
import { useT } from "@/components/i18n-provider"
import { PhotoCropper, type CropOutput } from "@/components/photo-cropper"

// Profielfoto: kiezen, bijsnijden in een vierkant, en in drie maten opslaan.
// De DJ ziet meteen wat er in de kaart en in de cirkel terechtkomt.

const MAX_BYTES = 25 * 1024 * 1024

export function AvatarUploader({
  userId,
  initialUrl,
  initials,
}: {
  userId: string
  initialUrl: string | null
  initials: string
}) {
  const { t } = useT()
  const p = t.profile
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [pending, setPending] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(file: File | null) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError(p.photoNotAnImage)
      return
    }
    if (file.size > MAX_BYTES) {
      setError(p.photoTooHeavy)
      return
    }
    setPending(file)
  }

  async function store(out: CropOutput) {
    setPending(null)
    setBusy(true)
    setError(null)
    try {
      const stamp = Date.now()
      const folder = `${userId}/avatar`
      const variants: Record<string, string> = {}

      for (const part of out.parts) {
        const ext = part.blob.type.includes("webp") ? "webp" : "jpg"
        const path = `${folder}/${stamp}-${part.width}.${ext}`
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, part.blob, {
            contentType: part.blob.type,
            // De naam bevat een tijdstempel, dus deze bestanden veranderen
            // nooit meer: een jaar cachen mag.
            cacheControl: "31536000",
            upsert: false,
          })
        if (upErr) {
          setError(upErr.message)
          return
        }
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
        variants[String(part.width)] = pub.publicUrl
      }

      const saved = await setArtistAvatarSet({ variants, blur: out.blur })
      if (!saved) {
        setError(p.photoSaveFailed)
        return
      }

      setUrl(variants["512"] ?? variants["1200"] ?? Object.values(variants)[0] ?? null)

      // Oude foto's opruimen: alles in de avatar-map dat niet van deze upload
      // is, plus de losse bestanden uit de oude opzet (userId/avatar-…).
      const { data: current } = await supabase.storage.from("media").list(folder)
      const { data: legacy } = await supabase.storage.from("media").list(userId)
      const stale = [
        ...(current ?? [])
          .filter((f) => !f.name.startsWith(`${stamp}-`))
          .map((f) => `${folder}/${f.name}`),
        ...(legacy ?? [])
          .filter((f) => f.name.startsWith("avatar-"))
          .map((f) => `${userId}/${f.name}`),
      ]
      if (stale.length > 0) await supabase.storage.from("media").remove(stale)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-xl font-semibold text-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={p.avatarAlt} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0] ?? null)
                e.target.value = ""
              }}
            />
            {busy ? p.uploading : url ? p.avatarChange : p.avatarAdd}
          </label>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-xs text-muted">
        <li>{p.photoTipFace}</li>
        <li>{p.photoTipSize}</li>
        <li>{p.photoTipLight}</li>
        <li>{p.photoTipOriginal}</li>
      </ul>

      {pending && (
        <PhotoCropper
          file={pending}
          labels={{
            title: p.cropTitle,
            hint: p.cropHint,
            zoom: p.cropZoom,
            cancel: p.cropCancel,
            confirm: p.cropConfirm,
            working: p.uploading,
            tooSmall: p.photoTooSmall,
            soft: p.photoSoft,
            loadFailed: p.photoLoadFailed,
          }}
          onCancel={() => setPending(null)}
          onDone={store}
        />
      )}
    </div>
  )
}
