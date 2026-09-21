"use client"

import { useState } from "react"
import { addManualLead } from "./actions"
import { SubmitButton } from "./submit-button"
import type { dict } from "./i18n"

type D = (typeof dict)["nl"]

// Zo groot mag de verkleinde screenshot hooguit worden. Een server action
// accepteert standaard 1 MB, en base64 maakt alles een derde groter.
const MAX_BYTES = 600_000
const MAX_SIDE = 1600

// Verkleint een afbeelding in de browser tot een JPEG die ruim onder de grens
// blijft. Tekst op een telefoonscreenshot blijft op 1600 pixels goed leesbaar.
async function shrink(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null
  for (const side of [MAX_SIDE, 1280, 1024]) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const url = canvas.toDataURL("image/jpeg", q)
      if ((url.length * 3) / 4 <= MAX_BYTES) return url
    }
  }
  return null
}

export function AddLeadForm({ d }: { d: D }) {
  const [shot, setShot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function take(file: Blob | null | undefined) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith("image/")) return setError(d.addShotNotImage)
    setBusy(true)
    const url = await shrink(file)
    setBusy(false)
    if (!url) return setError(d.addShotFailed)
    setShot(url)
  }

  return (
    <form
      action={addManualLead}
      className="flex flex-col gap-4"
      // Een screenshot rechtstreeks plakken met Ctrl+V werkt ook.
      onPaste={(e) => {
        const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))
        if (item) {
          e.preventDefault()
          take(item.getAsFile())
        }
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{d.addRawLabel}</span>
        <textarea
          name="raw_text"
          rows={6}
          maxLength={20000}
          placeholder={d.addRawPlaceholder}
          className="input min-h-32 resize-y font-mono text-sm"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{d.addShotLabel}</span>
        {shot ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot}
              alt={d.addShotLabel}
              className="h-28 w-auto rounded-lg border border-border object-contain"
            />
            <button
              type="button"
              onClick={() => setShot(null)}
              className="text-xs text-muted hover:text-red-300"
            >
              {d.addShotRemove}
            </button>
          </div>
        ) : (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
              disabled={busy}
              className="hidden"
              onChange={(e) => {
                take(e.target.files?.[0])
                e.target.value = ""
              }}
            />
            {busy ? d.addShotBusy : d.addShotPick}
          </label>
        )}
        <span className="text-xs text-muted">{d.addShotHint}</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <input type="hidden" name="screenshot" value={shot ?? ""} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{d.addSourceLabel}</span>
        <input
          name="source_note"
          required
          maxLength={1000}
          placeholder={d.addSourcePlaceholder}
          className="input"
        />
        <span className="text-xs text-muted">{d.addSourceHint}</span>
      </label>
      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="self_submitted" className="mt-1 h-4 w-4 flex-none accent-brand" />
        <span>
          <span className="text-sm font-medium">{d.addSelfLabel}</span>
          <span className="mt-0.5 block text-xs text-muted">{d.addSelfHint}</span>
        </span>
      </label>
      <SubmitButton
        busyText={shot ? d.addBusyShot : d.addBusy}
        className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
      >
        {d.addBtn}
      </SubmitButton>
    </form>
  )
}
