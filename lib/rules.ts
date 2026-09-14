import type { Locale } from "@/lib/i18n/config"

// De MyGigs-huisregels. Eén bron voor alle plekken waar ze staan: de
// doorklikker op het DJ-profiel, het scherm waarin je een boeking accepteert
// en het publieke profiel. Verander je de tekst inhoudelijk, verhoog dan de
// versie: DJ's moeten dan opnieuw akkoord geven.

export const HOUSE_RULES_VERSION = 2

export type HouseRule = {
  n: number
  icon: string
  title: string
  body: string
  /** Kleine toevoeging onder de regel, voor een gevolg of een uitzondering. */
  note?: string
  /** Kernafspraak: staat ook in het korte lijstje bij het accepteren van een boeking. */
  core?: boolean
}

const NL: HouseRule[] = [
  {
    n: 1,
    icon: "🚫",
    title: "No Alcohol",
    body: "We vragen je om zonder alcohol of drugs te draaien. Je kwaliteiten zijn on point en de atmosfeer tijdens je gig. Denk ook aan de veiligheid van jou en die van een ander.",
    core: true,
  },
  {
    n: 2,
    icon: "⏳",
    title: "Afmelden 24 uur van tevoren",
    body: "Kan je boeking door omstandigheden niet doorgaan? Laat dit zo snel mogelijk weten via de afmeldknop. Zo hebben we tijd om zo snel mogelijk een vervanger te vinden.",
    note: "Binnen 24 uur kan de klant een review achterlaten voor een No-Show.",
    core: true,
  },
  {
    n: 3,
    icon: "👔",
    title: "Kledingvoorschriften",
    body: "Is er bij de boeking een dresscode of thema doorgegeven? Houd je daaraan, zo bezorg je de klant een prachtige dag. Ook jouw mening telt: geef vroegtijdig aan als je dat niet wilt.",
    core: true,
  },
  {
    n: 4,
    icon: "🕒",
    title: "Op tijd aanwezig",
    body: "Wees op tijd op de afgesproken locatie, volgens schema.",
    core: true,
  },
  {
    n: 5,
    icon: "🔥",
    title: "We want more!",
    body: "Is je set geweldig en wil de klant je langer laten draaien? Geef dit aan in de app, dan passen we de betaling aan. Je verlengt simpelweg de tijd en de prijs wordt automatisch doorberekend.",
  },
  {
    n: 6,
    icon: "🤝",
    title: "Respect voor gasten en personeel",
    body: "Iedereen moet zich veilig voelen op de vloer. Let's make it happen!",
    core: true,
  },
  {
    n: 7,
    icon: "🔐",
    title: "AVG Bescherming",
    body: "De gegevens van de klant mogen niet gedeeld worden. Houd de gegevens privé.",
  },
  {
    n: 8,
    icon: "📸",
    title: "Film overeenkomst",
    body: "Content maken voor je profiel is top! Bespreek dit met de klant om verwarring te voorkomen.",
  },
]

const EN: HouseRule[] = [
  {
    n: 1,
    icon: "🚫",
    title: "No Alcohol",
    body: "We ask you to play without alcohol or drugs. Your skills are on point, and so is the atmosphere during your gig. Think of your own safety and that of everyone around you.",
    core: true,
  },
  {
    n: 2,
    icon: "⏳",
    title: "Cancel 24 hours ahead",
    body: "Can your booking not go ahead? Let us know as soon as you can through the cancel button. That gives us time to find a stand-in quickly.",
    note: "Within 24 hours the client can leave a review for a no-show.",
    core: true,
  },
  {
    n: 3,
    icon: "👔",
    title: "Dress code",
    body: "Has a dress code or theme been given with the booking? Stick to it, that is how you give the client a beautiful day. Your view counts too: say so in good time if you would rather not.",
    core: true,
  },
  {
    n: 4,
    icon: "🕒",
    title: "There on time",
    body: "Be at the agreed location on time, as scheduled.",
    core: true,
  },
  {
    n: 5,
    icon: "🔥",
    title: "We want more!",
    body: "Is your set going down well and does the client want you to play on? Set it in the app and we adjust the payment. You simply extend the time and the price is calculated automatically.",
  },
  {
    n: 6,
    icon: "🤝",
    title: "Respect for guests and staff",
    body: "Everyone should feel safe on the floor. Let's make it happen!",
    core: true,
  },
  {
    n: 7,
    icon: "🔐",
    title: "Data protection",
    body: "The client's details are not to be shared. Keep them private.",
  },
  {
    n: 8,
    icon: "📸",
    title: "Filming agreement",
    body: "Making content for your profile is great! Talk it through with the client to avoid any confusion.",
  },
]

export const HOUSE_RULES: Record<Locale, HouseRule[]> = { nl: NL, en: EN }

// Wat MyGigs er tegenover zet. Afspraken die één kant op werken voelen als een
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
