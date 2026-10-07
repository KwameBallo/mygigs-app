import "server-only"
import { sanitize } from "@/lib/ai/extract-dj"

// =============================================================
// Een lijst DJ's inlezen uit een CSV.
//
// Dit bestand doet alleen het lezen en controleren. Het raakt de database niet
// aan en stuurt niets. Dat is bewust: zo kan de droogloop precies hetzelfde
// werk doen als de echte import, en ziet je voorbeeld dus wat er straks ook
// echt gebeurt.
//
// Wat hier NIET gebeurt, en waarom:
//   - geen foto's. Een foto van iemands profiel is werk van een fotograaf, en
//     die mag jij niet op je eigen domein zetten voordat de DJ ja heeft gezegd.
//     De DJ uploadt er zelf een bij het opeisen.
//   - niets wordt op self_submitted gezet. Deze mensen hebben zich niet
//     aangemeld, jij hebt ze gevonden. Dat verschil bepaalt welke tekst de
//     uitnodigingsmail gebruikt, inclusief de AVG-regel over de herkomst.
// =============================================================

export type LeadVelden = {
  stage_name: string
  email: string
  home_city: string | null
  base_gage: number | null
  bio: string | null
  instagram_handle: string | null
  soundcloud_url: string | null
  mixcloud_url: string | null
  spotify_url: string | null
  website_url: string | null
  genres: string[]
  source_note: string
}

export type ImportRij = {
  /** Regelnummer in het bestand, de kopregel meegeteld. Zo kun je hem opzoeken. */
  regel: number
  /** Alleen gevuld als er geen blokkerende problemen zijn. */
  velden: LeadVelden | null
  /** Hierdoor gaat de rij niet mee. */
  problemen: string[]
  /** Hierdoor gaat de rij wel mee, maar er valt iets over te zeggen. */
  opmerkingen: string[]
}

export type LeesResultaat = {
  rijen: ImportRij[]
  /** Gevuld als het bestand als geheel onbruikbaar is. */
  fout?: string
  /** Kopnamen die we niet herkenden. Die zijn genegeerd. */
  onbekendeKolommen: string[]
}

/** Meer dan dit in één keer is geen import meer maar een ongeluk. */
export const MAX_RIJEN = 200

// ------------------------------------------------------------------
// De kolomnamen die we accepteren
// ------------------------------------------------------------------

// Links de naam in de database, rechts wat er in een kopregel mag staan. Alles
// wordt kleingemaakt en ontdaan van spaties en liggende streepjes voordat we
// vergelijken, dus "Artiestennaam" en "artiesten naam" komen allebei aan.
const KOLOMMEN: Record<keyof LeadVelden, string[]> = {
  stage_name: ["stagename", "naam", "artiestennaam", "djnaam", "dj", "name", "artist"],
  email: ["email", "mail", "emailadres", "mailadres"],
  home_city: ["homecity", "stad", "plaats", "woonplaats", "city"],
  base_gage: ["basegage", "gage", "tarief", "prijs", "fee"],
  bio: ["bio", "beschrijving", "omschrijving", "over"],
  instagram_handle: ["instagramhandle", "instagram", "insta", "ig"],
  soundcloud_url: ["soundcloudurl", "soundcloud"],
  mixcloud_url: ["mixcloudurl", "mixcloud"],
  spotify_url: ["spotifyurl", "spotify"],
  website_url: ["websiteurl", "website", "site", "web"],
  genres: ["genres", "genre", "stijl", "stijlen"],
  source_note: ["sourcenote", "bron", "source", "herkomst", "gevondenvia"],
}

function normaliseerKop(naam: string): string {
  return naam
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.]/g, "")
}

// ------------------------------------------------------------------
// Het lezen van het bestand zelf
// ------------------------------------------------------------------

/**
 * Welk scheidingsteken gebruikt dit bestand?
 *
 * Nederlandse Excel schrijft puntkomma's, de rest van de wereld komma's. We
 * kijken naar de kopregel buiten aanhalingstekens en nemen wat daar het vaakst
 * staat. Bij gelijkspel wint de komma.
 */
function raadScheidingsteken(kopregel: string): "," | ";" | "\t" {
  let inAanhaling = false
  const telling = { ",": 0, ";": 0, "\t": 0 }
  for (const teken of kopregel) {
    if (teken === '"') inAanhaling = !inAanhaling
    else if (!inAanhaling && (teken === "," || teken === ";" || teken === "\t")) {
      telling[teken]++
    }
  }
  if (telling["\t"] > telling[","] && telling["\t"] > telling[";"]) return "\t"
  return telling[";"] > telling[","] ? ";" : ","
}

/**
 * Leest CSV naar rijen met velden.
 *
 * Houdt rekening met aanhalingstekens, met regeleinden binnen een veld, en met
 * de dubbele aanhalingstekens waarmee CSV een echt aanhalingsteken schrijft.
 * Geen bibliotheek: het formaat is klein genoeg om zelf te doen, en dat scheelt
 * een afhankelijkheid die bij elke bouw meegaat.
 */
export function parseCsv(tekst: string): string[][] {
  const schoon = tekst.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const eersteRegel = schoon.split("\n", 1)[0] ?? ""
  const scheiding = raadScheidingsteken(eersteRegel)

  const rijen: string[][] = []
  let rij: string[] = []
  let veld = ""
  let inAanhaling = false

  for (let i = 0; i < schoon.length; i++) {
    const teken = schoon[i]

    if (inAanhaling) {
      if (teken === '"') {
        if (schoon[i + 1] === '"') {
          veld += '"'
          i++
        } else {
          inAanhaling = false
        }
      } else {
        veld += teken
      }
      continue
    }

    if (teken === '"') {
      inAanhaling = true
    } else if (teken === scheiding) {
      rij.push(veld)
      veld = ""
    } else if (teken === "\n") {
      rij.push(veld)
      rijen.push(rij)
      rij = []
      veld = ""
    } else {
      veld += teken
    }
  }
  rij.push(veld)
  rijen.push(rij)

  // Lege staartregels weggooien: een bestand eindigt bijna altijd op een enter.
  return rijen.filter((r) => r.some((v) => v.trim() !== ""))
}

// ------------------------------------------------------------------
// Van rijen naar aanmeldingen
// ------------------------------------------------------------------

function splitsGenres(waarde: string): string[] {
  return waarde
    .split(/[|;/,]/)
    .map((g) => g.trim())
    .filter(Boolean)
}

/**
 * Leest de hele lijst en controleert elke rij.
 *
 * `standaardBron` is de bron die je op het formulier invult. Een rij met een
 * eigen bronkolom gebruikt die, anders valt hij hierop terug. Zonder allebei
 * gaat de rij niet mee: zonder bron kun je de DJ niet vertellen waar zijn
 * gegevens vandaan komen, en dat is geen vrije keuze maar een plicht.
 */
export function leesLeads(
  tekst: string,
  bekendeGenres: string[],
  standaardBron: string,
): LeesResultaat {
  const s = sanitize
  const rijen = parseCsv(tekst)
  if (rijen.length === 0) {
    return { rijen: [], fout: "Het bestand is leeg.", onbekendeKolommen: [] }
  }

  const kopregel = rijen[0].map(normaliseerKop)
  const index: Partial<Record<keyof LeadVelden, number>> = {}
  const herkend = new Set<number>()
  for (const [veld, namen] of Object.entries(KOLOMMEN) as [keyof LeadVelden, string[]][]) {
    const i = kopregel.findIndex((k) => namen.includes(k))
    if (i >= 0) {
      index[veld] = i
      herkend.add(i)
    }
  }
  const onbekendeKolommen = rijen[0]
    .map((naam, i) => (herkend.has(i) || !naam.trim() ? null : naam.trim()))
    .filter(Boolean) as string[]

  if (index.stage_name === undefined) {
    return {
      rijen: [],
      fout:
        "Geen kolom met de artiestennaam gevonden. Noem die kolom 'naam' of 'stage_name'.",
      onbekendeKolommen,
    }
  }
  if (index.email === undefined) {
    return {
      rijen: [],
      fout:
        "Geen kolom met het mailadres gevonden. Zonder mailadres kun je geen uitnodiging sturen, dus die kolom is verplicht.",
      onbekendeKolommen,
    }
  }

  const gegevens = rijen.slice(1)
  if (gegevens.length > MAX_RIJEN) {
    return {
      rijen: [],
      fout: `Dit bestand heeft ${gegevens.length} regels. Er kunnen er ${MAX_RIJEN} per keer mee. Knip de lijst op.`,
      onbekendeKolommen,
    }
  }

  const uit: ImportRij[] = []
  // Dubbel binnen het bestand zelf. Dat gebeurt vaker dan je denkt bij een
  // lijst die uit meerdere bronnen is geplakt.
  const gezienEmail = new Set<string>()
  const gezienHandle = new Set<string>()

  gegevens.forEach((rij, i) => {
    const regel = i + 2
    const lees = (veld: keyof LeadVelden): string => {
      const k = index[veld]
      return k === undefined ? "" : (rij[k] ?? "").trim()
    }

    const problemen: string[] = []
    const opmerkingen: string[] = []

    const stageName = s.text(lees("stage_name"), s.MAX.stage_name)
    if (!stageName) problemen.push("geen artiestennaam")

    const email = s.email(lees("email"))
    if (!lees("email")) problemen.push("geen mailadres")
    else if (!email) problemen.push("mailadres klopt niet")

    const bron = lees("source_note") || standaardBron
    if (!bron) problemen.push("geen bron ingevuld")

    const handle = s.handle(lees("instagram_handle"))
    if (lees("instagram_handle") && !handle) {
      opmerkingen.push("instagramnaam niet begrepen, overgeslagen")
    }

    const gage = s.gage(lees("base_gage"))
    if (lees("base_gage") && gage === null) {
      opmerkingen.push("tarief niet begrepen, leeg gelaten")
    }

    const genresRuw = splitsGenres(lees("genres"))
    const genres = s.genres(genresRuw, bekendeGenres)
    const kwijt = genresRuw.length - genres.length
    if (kwijt > 0) {
      opmerkingen.push(
        kwijt === genresRuw.length
          ? "geen van de genres is bekend, leeg gelaten"
          : `${kwijt} ${kwijt === 1 ? "genre" : "genres"} onbekend, overgeslagen`,
      )
    }

    if (email) {
      const sleutel = email.toLowerCase()
      if (gezienEmail.has(sleutel)) problemen.push("dit mailadres staat al eerder in dit bestand")
      else gezienEmail.add(sleutel)
    }
    if (handle) {
      const sleutel = handle.toLowerCase()
      if (gezienHandle.has(sleutel)) {
        problemen.push("deze instagramnaam staat al eerder in dit bestand")
      } else gezienHandle.add(sleutel)
    }

    uit.push({
      regel,
      problemen,
      opmerkingen,
      velden:
        problemen.length > 0
          ? null
          : {
              // Allebei zeker gevuld: zonder die twee staat er hierboven een
              // probleem en komen we hier niet.
              stage_name: stageName as string,
              email: email as string,
              home_city: s.city(lees("home_city")),
              base_gage: gage,
              bio: s.bio(lees("bio")),
              instagram_handle: handle,
              soundcloud_url: s.url(lees("soundcloud_url"), ["soundcloud.com"]),
              mixcloud_url: s.url(lees("mixcloud_url"), ["mixcloud.com"]),
              spotify_url: s.url(lees("spotify_url"), ["spotify.com"]),
              website_url: s.url(lees("website_url")),
              genres,
              source_note: bron.slice(0, 1000),
            },
    })
  })

  return { rijen: uit, onbekendeKolommen }
}

/** De kopregel die we zelf zouden schrijven, voor het voorbeeldbestand. */
export const VOORBEELD_CSV = [
  "naam,email,stad,genres,tarief,instagram,soundcloud,bio,bron",
  '"DJ Voorbeeld",dj@voorbeeld.nl,Amsterdam,"House|Techno",450,djvoorbeeld,https://soundcloud.com/djvoorbeeld,"Draait sinds 2018 in Amsterdam.","soundcloud.com, gevonden op 7 oktober"',
].join("\n")
