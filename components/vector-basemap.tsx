"use client"

import { useEffect, useState } from "react"
import { useMap } from "react-leaflet"
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet"
import "maplibre-gl/dist/maplibre-gl.css"

// De ondergrond van alle kaarten in de app.
//
// Hiervoor gebruikten we de rasterkaarten van CARTO. Die zijn een sleutel gaan
// eisen en drukken sindsdien "API KEY REQUIRED" over elke tegel; CARTO zegt er
// zelf bij dat ze deze kaartsoort willen uitfaseren. OpenFreeMap vraagt geen
// sleutel en stelt geen limiet.
const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const

export type BasemapVariant = keyof typeof STYLES

// Bronvermelding is verplicht bij OpenStreetMap-gegevens.
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

// TIJDELIJK: zet dit op false zodra we weten waarom de kaart leeg bleef.
const DIAGNOSE = true

export function VectorBasemap({
  variant = "light",
}: {
  variant?: BasemapVariant
}) {
  const map = useMap()
  const style = STYLES[variant]
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    const add = (s: string) =>
      setLines((prev) => (prev.includes(s) ? prev : [...prev, s]))

    // Blokkeert het beveiligingsbeleid iets? Dan komt dat hier binnen.
    const onCsp = (e: SecurityPolicyViolationEvent) =>
      add(`GEBLOKKEERD: ${e.blockedURI || "(inline)"} via ${e.violatedDirective}`)
    if (DIAGNOSE) window.addEventListener("securitypolicyviolation", onCsp)

    const layer = maplibreGL({ style, attributionControl: false })
    layer.addTo(map)
    map.attributionControl?.addAttribution(ATTRIBUTION)

    if (DIAGNOSE) {
      try {
        const gl = layer.getMaplibreMap()
        const canvas = gl.getCanvas()
        const ctx = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
        add(`webgl: ${ctx ? "ja" : "NEE"} | canvas ${canvas.width}x${canvas.height}`)

        gl.on("error", (e) => add(`FOUT: ${e?.error?.message ?? "onbekend"}`))
        gl.on("styledata", () => add("styledata"))
        gl.on("sourcedata", () => add("sourcedata"))
        gl.on("dataloading", () => add("dataloading"))
        gl.on("load", () => add("LOAD"))
        gl.on("idle", () => add("IDLE"))

        // Na 8 seconden de tussenstand opnemen: hoe ver is hij gekomen?
        setTimeout(() => {
          try {
            const st = gl.getStyle()
            add(
              `8s: stijlKlaar=${gl.isStyleLoaded()} lagen=${st?.layers?.length ?? 0} bronnen=${Object.keys(st?.sources ?? {}).length}`,
            )
            add(`sprite=${String(st?.sprite ?? "-").slice(0, 60)}`)
            add(`glyphs=${String(st?.glyphs ?? "-").slice(0, 60)}`)
          } catch (e) {
            add(`8s fout: ${e instanceof Error ? e.message : String(e)}`)
          }
        }, 8000)
      } catch (e) {
        add(`OPSTARTFOUT: ${e instanceof Error ? e.message : String(e)}`)
      }

      // Welk beveiligingsbeleid stuurt de server nu echt mee?
      fetch("/discover", { method: "HEAD" })
        .then((r) => {
          const csp = r.headers.get("content-security-policy") ?? ""
          const m = csp.match(/script-src[^;]*/)
          add(`CSP: ${m ? m[0].slice(0, 70) : "(geen)"}`)
        })
        .catch(() => add("CSP: niet te lezen"))

      // Komen de losse onderdelen van de kaart binnen?
      const base = "https://tiles.openfreemap.org"
      fetch(`${base}/styles/positron`)
        .then((r) => r.json())
        .then(async (st) => {
          add(`stijl: ${st.layers?.length ?? 0} lagen`)
          const src = st.sources?.openmaptiles?.url
          if (src) {
            const r = await fetch(src)
            const tj = await r.json()
            add(`tegelbron: ${r.status}, tegels=${tj.tiles?.[0]?.slice(0, 45) ?? "-"}`)
            if (tj.tiles?.[0]) {
              const one = tj.tiles[0]
                .replace("{z}", "8")
                .replace("{x}", "131")
                .replace("{y}", "84")
              const rt = await fetch(one)
              add(`losse tegel: ${rt.status} ${rt.headers.get("content-type")}`)
            }
          }
        })
        .catch((e) => add(`stijl/tegel MISLUKT: ${e.message}`))
    }

    return () => {
      if (DIAGNOSE) window.removeEventListener("securitypolicyviolation", onCsp)
      map.attributionControl?.removeAttribution(ATTRIBUTION)
      map.removeLayer(layer)
    }
  }, [map, style])

  if (!DIAGNOSE) return null

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 1000,
        maxWidth: 520,
        background: "rgba(0,0,0,.85)",
        color: "#fff",
        font: "12px/1.5 monospace",
        padding: "8px 10px",
        borderRadius: 8,
        whiteSpace: "pre-wrap",
      }}
    >
      {lines.length ? lines.join("\n") : "diagnose: nog niets gemeld"}
    </div>
  )
}
