"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet"
import "maplibre-gl/dist/maplibre-gl.css"

// De ondergrond van alle kaarten in de app.
//
// Hiervoor gebruikten we de rasterkaarten van CARTO. Die zijn een sleutel gaan
// eisen en drukken sindsdien "API KEY REQUIRED" over elke tegel; CARTO zegt er
// zelf bij dat ze deze kaartsoort willen uitfaseren. OpenFreeMap vraagt geen
// sleutel en stelt geen limiet.
//
// Het verschil met vroeger zit onder de motorkap: dit zijn geen kant-en-klare
// plaatjes meer maar vectoren die in de browser worden getekend. Daardoor
// blijven straatnamen scherp bij elke zoomstand. De stijl "positron" is bewust
// gekozen: dat is dezelfde lichte kaart als we hadden, dus de app ziet er
// hetzelfde uit.
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

export function VectorBasemap({
  variant = "light",
}: {
  variant?: BasemapVariant
}) {
  const map = useMap()
  const style = STYLES[variant]

  useEffect(() => {
    // MapLibre tekent zelf ook een bronvermelding in zijn eigen canvas. Die
    // zetten we uit, anders staat hij er twee keer: we hangen de tekst aan de
    // bestaande balk van Leaflet.
    const layer = maplibreGL({ style, attributionControl: false })
    layer.addTo(map)
    map.attributionControl?.addAttribution(ATTRIBUTION)

    return () => {
      map.attributionControl?.removeAttribution(ATTRIBUTION)
      map.removeLayer(layer)
    }
  }, [map, style])

  return null
}
