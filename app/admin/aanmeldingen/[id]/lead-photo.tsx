"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useT } from "@/components/i18n-provider"
import { PhotoCropper, type CropOutput } from "@/components/photo-cropper"
import { finishLeadPhotoUpload, startLeadPhotoUpload } from "../actions"

// Foto bij een aanmelding. Zelfde bijsnijder als bij het gewone profiel; de
// drie maten gaan rechtstreeks naar de afgeschermde opslag via uploadlinks die
// de server uitgeeft. Openbaar wordt de foto pas als de DJ toestemming geeft.

const MAX_BYTES = 25 * 1024 * 1024
const BUCKET = "lead-photos"

export function LeadPhoto({
  leadId,
  initialUrl,
  editable,
  labels,
}: {
  leadId: string
  initialUrl: string | null
  editable: boolean
  labels: { add: string; change: string; failed: string; alt: string; none: string }
}) {
  const { t } = useT()
  const p = t.profile
  const router = useRouter()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [pending, setPending] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(file: File | null) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith("image/")) return setError(p.photoNotAnImage)
    if (file.size > MAX_BYTES) return setError(p.photoTooHeavy)
    setPending(file)
  }

  async function store(out: CropOutput) {
    setPending(null)
    setBusy(true)
    setError(null)
    try {
      const files = out.parts.map((part) => ({
        width: String(part.width),
        ext: part.blob.type.includes("webp") ? "webp" : "jpg",
        blob: part.blob,
      }))
      const start = await startLeadPhotoUpload({
        id: leadId,
        files: files.map(({ width, ext }) => ({ width, ext })),
      })
      if (!start.ok) return setError(labels.failed)

      const supabase = createClient()
      for (const slot of start.slots) {
        const file = files.find((f) => f.width === slot.width)
        if (!file) continue
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(slot.path, slot.token, file.blob, {
            contentType: file.blob.type,
          })
        if (upErr) return setError(labels.failed)
      }

      const done = await finishLeadPhotoUpload({
        id: leadId,
        stamp: start.stamp,
        blur: out.blur,
      })
      if (!done.ok) return setError(labels.failed)

      const preview = files.find((f) => f.width === "512") ?? files[0]
      if (preview) setUrl(URL.createObjectURL(preview.blob))
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2 text-xs text-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={labels.alt} className="h-full w-full object-cover" />
          ) : (
            labels.none
          )}
        </div>
        {editable && (
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
              {busy ? p.uploading : url ? labels.change : labels.add}
            </label>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        )}
      </div>

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
            dark: p.photoDark,
            bright: p.photoBright,
            blurry: p.photoBlurry,
            loadFailed: p.photoLoadFailed,
          }}
          onCancel={() => setPending(null)}
          onDone={store}
        />
      )}
    </div>
  )
}
