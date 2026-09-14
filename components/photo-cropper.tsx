"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react"

// Vierkante bijsnijder voor profielfoto's.
//
// De DJ sleept en zoomt tot zijn gezicht goed staat; wij snijden exact dat
// vierkant uit en schrijven het weg in drie maten plus een piepkleine
// vervaagde placeholder. Alles gebeurt in de browser: het originele bestand
// (en dus ook de GPS-locatie die in een telefoonfoto zit) verlaat het toestel
// nooit, want canvas herschrijft de foto zonder die metagegevens.

export const OUTPUT_WIDTHS = [1200, 512, 160] as const

/** Onder deze uitsnede in originele pixels wordt het merkbaar zacht. */
const SOFT_MIN = 600
/** Hieronder weigeren we: dat wordt in een kaart een blokkenpuzzel. */
const HARD_MIN = 320

export type CropOutput = {
  parts: { width: number; blob: Blob }[]
  blur: string
  sourceSide: number
}

type Labels = {
  title: string
  hint: string
  zoom: string
  cancel: string
  confirm: string
  working: string
  tooSmall: string
  soft: string
  dark: string
  bright: string
  blurry: string
  loadFailed: string
}

// Wat er mis kan zijn met de uitsnede. We zeggen niets zolang er niets aan de
// hand is: een lijst met tips leest toch niemand, en een melding op het moment
// zelf wél. "block" houdt de knop tegen, "warn" is een advies.
type IssueKey = "small" | "soft" | "dark" | "bright" | "blurry"
type Issue = { key: IssueKey; level: "block" | "warn" }

/** Meetlat: hoe licht, hoe uitgebeten en hoe scherp is de uitsnede? */
const SCAN = 256
const TILES = 4
const DARK_MAX = 0.15
const BRIGHT_MIN = 0.82
const BLOWN_MAX = 0.25
const SHARP_MIN = 0.0005

function inspect(canvas: HTMLCanvasElement): IssueKey[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []
  const { data } = ctx.getImageData(0, 0, SCAN, SCAN)
  const lum = new Float32Array(SCAN * SCAN)

  let sum = 0
  let blown = 0
  for (let i = 0; i < SCAN * SCAN; i++) {
    const l =
      (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255
    lum[i] = l
    sum += l
    if (l > 0.97) blown++
  }
  const mean = sum / (SCAN * SCAN)

  // Laplace-variantie: scherpe randen geven een hoge waarde, een wazige of
  // bewogen foto blijft vlak. We kijken per vak en houden het scherpste vak
  // aan. Anders zou een portret met een onscherpe achtergrond, juist het
  // soort foto dat er goed uitziet, als wazig worden aangemerkt.
  const step = Math.floor(SCAN / TILES)
  let sharpest = 0
  for (let ty = 0; ty < TILES; ty++) {
    for (let tx = 0; tx < TILES; tx++) {
      let s = 0
      let sq = 0
      let n = 0
      const y0 = Math.max(1, ty * step)
      const x0 = Math.max(1, tx * step)
      const y1 = Math.min(SCAN - 1, (ty + 1) * step)
      const x1 = Math.min(SCAN - 1, (tx + 1) * step)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * SCAN + x
          const v =
            4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - SCAN] - lum[i + SCAN]
          s += v
          sq += v * v
          n++
        }
      }
      if (n > 0) sharpest = Math.max(sharpest, sq / n - (s / n) ** 2)
    }
  }

  const found: IssueKey[] = []
  if (mean < DARK_MAX) found.push("dark")
  else if (mean > BRIGHT_MIN || blown / (SCAN * SCAN) > BLOWN_MAX) found.push("bright")
  if (sharpest < SHARP_MIN) found.push("blurry")
  return found
}

export function PhotoCropper({
  file,
  labels,
  onCancel,
  onDone,
}: {
  file: File
  labels: Labels
  onCancel: () => void
  onDone: (out: CropOutput) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<CanvasImageSource | null>(null)
  const natRef = useRef({ w: 0, h: 0 })
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null)

  const [frame, setFrame] = useState(320)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<IssueKey[]>([])

  // --- bron inladen -------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function load() {
      try {
        // Voorkeur: createImageBitmap. Die respecteert de EXIF-oriëntatie,
        // zodat een staande telefoonfoto niet gekanteld binnenkomt.
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" })
        if (cancelled) return
        imgRef.current = bmp
        natRef.current = { w: bmp.width, h: bmp.height }
        setReady(true)
      } catch {
        // Fallback voor browsers zonder die optie (of HEIC op Safari).
        const el = new Image()
        objectUrl = URL.createObjectURL(file)
        el.onload = () => {
          if (cancelled) return
          imgRef.current = el
          natRef.current = { w: el.naturalWidth, h: el.naturalHeight }
          setReady(true)
        }
        el.onerror = () => !cancelled && setError(labels.loadFailed)
        el.src = objectUrl
      }
    }
    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file, labels.loadFailed])

  // --- framebreedte meten -------------------------------------------------
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrame(el.clientWidth || 320))
    ro.observe(el)
    setFrame(el.clientWidth || 320)
    return () => ro.disconnect()
  }, [])

  // Zijde van de uitsnede in originele pixels.
  const sourceSide = ready ? Math.min(natRef.current.w, natRef.current.h) / zoom : 0

  const clamp = useCallback(
    (o: { x: number; y: number }, side: number) => {
      const { w, h } = natRef.current
      const maxX = Math.max(0, (w - side) / 2)
      const maxY = Math.max(0, (h - side) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [],
  )

  // --- tekenen ------------------------------------------------------------
  const paint = useCallback(
    (target: HTMLCanvasElement, out: number) => {
      const img = imgRef.current
      if (!img) return
      const { w, h } = natRef.current
      const side = Math.min(w, h) / zoom
      const c = clamp(offset, side)
      const sx = w / 2 + c.x - side / 2
      const sy = h / 2 + c.y - side / 2

      target.width = out
      target.height = out
      const ctx = target.getContext("2d")
      if (!ctx) return
      ctx.imageSmoothingQuality = "high"
      ctx.clearRect(0, 0, out, out)
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out)
    },
    [zoom, offset, clamp],
  )

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !ready) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    paint(cv, Math.round(frame * dpr))
    cv.style.width = `${frame}px`
    cv.style.height = `${frame}px`
  }, [ready, frame, paint])

  // --- nakijken ------------------------------------------------------------
  // Alleen meten als het beeld stilstaat, anders rekenen we ons suf tijdens het
  // slepen. Een kwart seconde na de laatste beweging is ruim genoeg.
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      const scratch = document.createElement("canvas")
      paint(scratch, SCAN)
      const hits = inspect(scratch)
      // Een kleine uitsnede wordt bij het opblazen naar de meetmaat vanzelf
      // zacht. Daar melden we al iets over, dus niet ook nog "onscherp".
      setFound(sourceSide < SOFT_MIN ? hits.filter((h) => h !== "blurry") : hits)
    }, 250)
    return () => clearTimeout(timer)
  }, [ready, paint, sourceSide])

  const issues: Issue[] = [
    ...(ready && sourceSide < HARD_MIN
      ? [{ key: "small" as const, level: "block" as const }]
      : []),
    ...(ready && sourceSide >= HARD_MIN && sourceSide < SOFT_MIN
      ? [{ key: "soft" as const, level: "warn" as const }]
      : []),
    ...found.map((key) => ({ key, level: "warn" as const })),
  ]
  const blocked = issues.some((i) => i.level === "block")

  // --- slepen -------------------------------------------------------------
  function onPointerDown(e: ReactPointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  function onPointerMove(e: ReactPointerEvent) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const side = Math.min(natRef.current.w, natRef.current.h) / zoom
    // Van schermpixels naar originele pixels.
    const k = side / frame
    const nx = offset.x - (e.clientX - d.x) * k
    const ny = offset.y - (e.clientY - d.y) * k
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    setOffset(clamp({ x: nx, y: ny }, side))
  }
  function onPointerUp() {
    dragRef.current = null
  }
  function onWheel(e: ReactWheelEvent) {
    const next = Math.min(6, Math.max(1, zoom * (e.deltaY < 0 ? 1.08 : 0.93)))
    setZoom(next)
    setOffset((o) => clamp(o, Math.min(natRef.current.w, natRef.current.h) / next))
  }

  // --- uitsnijden en wegschrijven ----------------------------------------
  async function confirm() {
    if (!ready || busy) return
    if (sourceSide < HARD_MIN) {
      setError(labels.tooSmall)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const parts: { width: number; blob: Blob }[] = []
      const scratch = document.createElement("canvas")

      // Nooit opblazen: een uitsnede van 700 px levert geen echte 1200 op.
      // We schrijven alleen de maten weg die de bron ook echt aankan.
      const widths: number[] = OUTPUT_WIDTHS.filter((w) => w <= sourceSide)
      if (widths.length === 0) widths.push(OUTPUT_WIDTHS[OUTPUT_WIDTHS.length - 1])

      for (const w of widths) {
        paint(scratch, w)
        const blob = await toBlob(scratch, "image/webp", 0.86)
        if (blob) parts.push({ width: w, blob })
      }

      paint(scratch, 20)
      const blur = scratch.toDataURL("image/jpeg", 0.5)

      onDone({ parts, blur, sourceSide: Math.round(sourceSide) })
    } catch {
      setError(labels.loadFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <h3 className="font-semibold tracking-tight">{labels.title}</h3>
          <p className="mt-1 text-sm text-muted">{labels.hint}</p>
        </div>

        <div ref={boxRef} className="relative mx-auto w-full max-w-[320px]">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            className="block w-full touch-none rounded-xl bg-surface-2 select-none"
            style={{ aspectRatio: "1 / 1", cursor: "grab" }}
          />

          {/* Hulplijnen: de cirkel is de avatar, de streepjeslijn is wat er in
              een kaartje overblijft, de horizontale lijn is waar de ogen
              ongeveer horen te zitten. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 rounded-full border border-white/50" />
            <div className="absolute inset-x-0 top-[12.5%] bottom-[12.5%] border border-dashed border-white/30" />
            <div className="absolute inset-x-0 top-1/3 border-t border-brand/50" />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-muted">
          <span className="w-12 flex-none">{labels.zoom}</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value)
              setZoom(z)
              setOffset((o) =>
                clamp(o, Math.min(natRef.current.w, natRef.current.h) / z),
              )
            }}
            className="w-full accent-[var(--brand)]"
          />
        </label>

        {/* Alleen iets zeggen als er iets aan de hand is, en dan meteen wat je
            eraan doet. Geen tiplijst voor de foto's die gewoon goed zijn. */}
        {issues.length > 0 && (
          <ul
            className={`flex flex-col gap-1.5 rounded-xl border p-3 text-xs leading-relaxed ${
              blocked
                ? "border-red-500/40 bg-red-500/5"
                : "border-amber-500/40 bg-amber-500/5"
            }`}
          >
            {issues.map((i) => (
              <li
                key={i.key}
                className={`flex gap-2 ${
                  i.level === "block" ? "text-red-300" : "text-amber-300"
                }`}
              >
                <span aria-hidden="true" className="flex-none">
                  {i.level === "block" ? "✕" : "!"}
                </span>
                <span>{labels[i.key === "small" ? "tooSmall" : i.key]}</span>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm transition hover:border-brand/50"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || busy || blocked}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition disabled:opacity-50"
          >
            {busy ? labels.working : labels.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (b) => {
        // Oudere browsers zonder webp: val terug op JPEG.
        if (b) return resolve(b)
        canvas.toBlob((j) => resolve(j), "image/jpeg", quality)
      },
      type,
      quality,
    )
  })
}
