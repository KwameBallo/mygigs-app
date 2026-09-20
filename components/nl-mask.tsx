"use client"

import { Polygon } from "react-leaflet"
import { NL_RINGS } from "@/lib/nl-outline"

// Dekt alles buiten de Nederlandse landsgrens af.
//
// Nederland is een staand land en een beeldscherm is liggend. Wie heel
// Nederland in beeld wil, krijgt er links en rechts dus altijd een flinke hap
// Duitsland en Belgie bij. Verder inzoomen lost dat niet op: dan valt de
// Randstad of juist Limburg buiten beeld.
//
// Daarom ligt er een laag overheen met een gat in de vorm van Nederland. De
// kaart eronder blijft ongemoeid, je ziet alleen het stuk binnen de grens.
// Eromheen blijft een rustig vlak.
//
// Hoe het werkt: een vlak bestaat uit ringen. De eerste ring is de buitenkant,
// elke volgende ring is een gat. Hier is de buitenkant een vak om Nederland
// heen en zijn de gaten het vasteland plus de Zeeuwse en de Waddeneilanden.
//
// De buitenrand is bewust niet de hele aardbol maar een royaal vak om
// West-Europa. Dat is ruimer dan je op deze kaart ooit kunt slepen, en het
// scheelt de browser het rekenen met peilloos grote getallen rond de polen.
const SURROUND: [number, number][] = [
  [35, -30],
  [70, -30],
  [70, 40],
  [35, 40],
]

export function NlMask({
  color = "#0b0b0c",
  border,
}: {
  /** Kleur van het vlak buiten de landsgrens. */
  color?: string
  /** Lijn op de grens zelf. Zonder opgave dezelfde kleur, dus onzichtbaar. */
  border?: string
}) {
  return (
    <Polygon
      positions={[SURROUND, ...NL_RINGS]}
      // Niet aanklikbaar: de laag ligt over de kaart heen, maar klikken en
      // slepen horen bij de kaart eronder terecht te komen.
      interactive={false}
      pathOptions={{
        fillColor: color,
        fillOpacity: 1,
        // Zonder deze regel wordt het gat gewoon meegekleurd.
        fillRule: "evenodd",
        // Een dunne lijn in dezelfde kleur maakt de rand glad in plaats van
        // getrapt. Geef een afwijkende kleur mee als je de grens wilt zien.
        color: border ?? color,
        weight: 1,
        opacity: 1,
      }}
    />
  )
}
