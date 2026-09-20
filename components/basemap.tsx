"use client"

import { TileLayer } from "react-leaflet"

// De ondergrond van alle kaarten in de app: gewone kaartplaatjes van CARTO.
//
// CARTO is halverwege 2026 een sleutel gaan eisen en drukte zonder sleutel
// "API KEY REQUIRED" over elke tegel. De sleutel is gratis (5 miljoen tegels
// per maand) en staat in NEXT_PUBLIC_CARTO_KEY. Hij is bewust publiek: de
// browser moet hem meesturen bij elke tegel, dus geheimhouden kan niet en
// heeft ook geen zin. Beperk hem bij CARTO tot mygigs.nl.
//
// We hebben hiervoor OpenFreeMap geprobeerd, dat geen sleutel vraagt. Dat
// tekent de kaart in de browser in plaats van kant-en-klare plaatjes te
// downloaden, en kreeg het laden hier niet af. Staat op de checklist om nog
// eens rustig uit te zoeken.
const STYLES = {
  light: "light_all",
  dark: "dark_all",
} as const

export type BasemapVariant = keyof typeof STYLES

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

export function Basemap({
  variant = "light",
}: {
  variant?: BasemapVariant
}) {
  const key = process.env.NEXT_PUBLIC_CARTO_KEY
  const suffix = key ? `?key=${key}` : ""

  return (
    <TileLayer
      url={`https://{s}.basemaps.cartocdn.com/${STYLES[variant]}/{z}/{x}/{y}{r}.png${suffix}`}
      attribution={ATTRIBUTION}
      subdomains="abcd"
      keepBuffer={4}
      updateWhenZooming={false}
    />
  )
}
