import type { Locale } from "@/lib/i18n/config"

// De MyGigs-huisregels. Eén bron voor alle plekken waar ze staan: het
// DJ-profiel, het scherm waarin je een boeking accepteert en het publieke
// profiel. Verander je de tekst inhoudelijk, verhoog dan de versie: DJ's
// moeten dan opnieuw akkoord geven.

export const HOUSE_RULES_VERSION = 1

export type HouseRule = {
  n: number
  icon: string
  title: string
  body: string
  /** Kernregel: staat ook in het korte lijstje bij het accepteren van een boeking. */
  core?: boolean
}

const NL: HouseRule[] = [
  {
    n: 1,
    icon: "🚫",
    title: "Je draait nuchter",
    body: "Geen alcohol en geen drugs voor of tijdens je optreden. Je bent er om te presteren, en daar betaalt de organisator voor.",
    core: true,
  },
  {
    n: 2,
    icon: "⏳",
    title: "Afmelden doe je 24 uur van tevoren",
    body: "Lukt het echt niet, gebruik dan de afmeldknop bij je boeking. Zo weten de organisator en MyGigs het tegelijk en kunnen wij een vervanger zoeken.",
    core: true,
  },
  {
    n: 3,
    icon: "👔",
    title: "Je kleedt je naar het thema",
    body: "Staat er een dresscode bij de boeking, dan volg je die. Twijfel je? Vraag het in de chat, niet op de avond zelf.",
    core: true,
  },
  {
    n: 4,
    icon: "🕒",
    title: "Je bent op tijd",
    body: "Minimaal 45 minuten voor aanvang aanwezig, zodat je rustig opbouwt en soundcheckt. Check in via de app zodra je er bent.",
    core: true,
  },
  {
    n: 5,
    icon: "🎧",
    title: "Je draait zelf",
    body: "Geen vervanger sturen zonder akkoord van de organisator en MyGigs. Ze hebben jou geboekt, niet iemand anders.",
  },
  {
    n: 6,
    icon: "📅",
    title: "Je houdt je aan de afgesproken tijden",
    body: "Begin- en eindtijd staan in de boeking. Langer doordraaien mag, maar leg het eerst vast in de app zodat het ook betaald wordt.",
  },
  {
    n: 7,
    icon: "🤝",
    title: "Je bent respectvol naar gasten en personeel",
    body: "Geen intimidatie, discriminatie of ongewenste avances, op geen enkele manier. Eén melding hierover is genoeg om je profiel direct te pauzeren.",
    core: true,
  },
  {
    n: 8,
    icon: "🔊",
    title: "Je volgt de regels van de locatie",
    body: "Geluidsnormen, eindtijd en aanwijzingen van de beveiliging of de geluidstechnicus. Aan hen hangt de vergunning van de avond.",
  },
  {
    n: 9,
    icon: "🔌",
    title: "Je apparatuur is veilig",
    body: "Deugdelijke kabels, niets in looppaden, niets dat kan omvallen. Schade die jij veroorzaakt is voor jouw rekening.",
  },
  {
    n: 10,
    icon: "💳",
    title: "Je regelt alles via MyGigs",
    body: "Betalingen, wijzigingen en afspraken lopen via het platform. Bij een deal buiten de app vervallen je bescherming, je factuur en je reviews.",
  },
  {
    n: 11,
    icon: "🔐",
    title: "Je gaat netjes om met gegevens",
    body: "Adres, telefoonnummer en plattegrond van de klant gebruik je alleen voor deze boeking. Niet delen, niet bewaren, niet hergebruiken.",
  },
  {
    n: 12,
    icon: "📸",
    title: "Je filmt met toestemming",
    body: "Content maken is goed voor je profiel, maar vraag het aan de organisator en film geen herkenbare gasten die dat niet willen.",
  },
]

const EN: HouseRule[] = [
  {
    n: 1,
    icon: "🚫",
    title: "You play sober",
    body: "No alcohol and no drugs before or during your set. You are there to perform, and that is what the organiser pays for.",
    core: true,
  },
  {
    n: 2,
    icon: "⏳",
    title: "Cancel at least 24 hours ahead",
    body: "If you really cannot make it, use the cancel button on your booking. The organiser and MyGigs hear it at the same time, so we can find a stand-in.",
    core: true,
  },
  {
    n: 3,
    icon: "👔",
    title: "You dress for the theme",
    body: "If the booking lists a dress code, you follow it. In doubt? Ask in the chat, not on the night itself.",
    core: true,
  },
  {
    n: 4,
    icon: "🕒",
    title: "You are on time",
    body: "On site at least 45 minutes before the start, so you can set up and sound check calmly. Check in through the app when you arrive.",
    core: true,
  },
  {
    n: 5,
    icon: "🎧",
    title: "You play yourself",
    body: "No stand-in without approval from the organiser and MyGigs. They booked you, not somebody else.",
  },
  {
    n: 6,
    icon: "📅",
    title: "You keep to the agreed times",
    body: "Start and end times are in the booking. Playing longer is fine, but record it in the app first so it gets paid.",
  },
  {
    n: 7,
    icon: "🤝",
    title: "You respect guests and staff",
    body: "No harassment, discrimination or unwanted advances, in any form. One report is enough for us to pause your profile immediately.",
    core: true,
  },
  {
    n: 8,
    icon: "🔊",
    title: "You follow the venue's rules",
    body: "Sound limits, closing time and instructions from security or the sound engineer. Their licence depends on it.",
  },
  {
    n: 9,
    icon: "🔌",
    title: "Your gear is safe",
    body: "Sound cables, nothing in walkways, nothing that can topple over. Damage you cause is on you.",
  },
  {
    n: 10,
    icon: "💳",
    title: "You arrange everything through MyGigs",
    body: "Payments, changes and agreements run through the platform. Deal outside the app and you lose your protection, your invoice and your reviews.",
  },
  {
    n: 11,
    icon: "🔐",
    title: "You handle data carefully",
    body: "The client's address, phone number and floor plan are for this booking only. Do not share, store or reuse them.",
  },
  {
    n: 12,
    icon: "📸",
    title: "You film with permission",
    body: "Content is good for your profile, but ask the organiser and do not film recognisable guests who would rather not be filmed.",
  },
]

export const HOUSE_RULES: Record<Locale, HouseRule[]> = { nl: NL, en: EN }

// Wat MyGigs er tegenover zet. Regels die één kant op werken voelen als een
// bureau, en daar komen onze DJ's juist vandaan.
export const HOUSE_PROMISES: Record<Locale, string[]> = {
  nl: [
    "Je gage staat veilig op het platform voordat je draait.",
    "Binnen vijf werkdagen na het optreden uitbetaald, met factuur.",
    "Zegt de organisator binnen 24 uur af, dan houd jij je gage.",
    "Bij een geschil kijkt MyGigs mee en horen we altijd beide kanten.",
  ],
  en: [
    "Your fee is held safely on the platform before you play.",
    "Paid out within five working days after the gig, with an invoice.",
    "If the organiser cancels within 24 hours, you keep your fee.",
    "In a dispute MyGigs steps in and always hears both sides.",
  ],
}

export function houseRules(locale: Locale) {
  return HOUSE_RULES[locale] ?? HOUSE_RULES.nl
}

export function coreRules(locale: Locale) {
  return houseRules(locale).filter((r) => r.core)
}

export function housePromises(locale: Locale) {
  return HOUSE_PROMISES[locale] ?? HOUSE_PROMISES.nl
}
