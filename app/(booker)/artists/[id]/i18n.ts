const nl = {
  // page.tsx
  backToDiscover: "← Terug naar ontdekken",
  verified: "Geverifieerd",
  online: "Online",
  bookedViaMyGigs: "{n}× geboekt via MyGigs",
  responds: "Reageert {r}",
  followersInstagram: "{n} op Instagram",
  followersTiktok: "{n} op TikTok",
  reviews: "Reviews",
  anonymous: "Anoniem",
  upcomingShows: "Aankomende shows",
  noPublicShows: "Geen openbare optredens gepland.",
  venueTbd: "Locatie volgt",
  respWithinMin: "binnen {n} min",
  respWithinHours: "binnen {n} uur",
  respWithinDay: "binnen {n} dag",
  respWithinDays: "binnen {n} dagen",
  months: [
    "jan", "feb", "mrt", "apr", "mei", "jun",
    "jul", "aug", "sep", "okt", "nov", "dec",
  ],

  // equipment-planner.tsx
  equipmentHeading: "Apparatuur",
  availableAtDj: "Beschikbaar bij deze DJ",
  availableHint:
    "Vink aan wat je van de DJ wilt (bij)huren — alleen dit telt bij de prijs.",
  priceRent: "€ {price} huur",
  included: "inbegrepen",
  djNoEquipment: "Deze DJ neemt geen eigen apparatuur mee.",
  needEquipment: "Heb je apparatuur nodig?",
  yes: "Ja",
  no: "Nee",
  noNeedNote: "Top — dan hoef je niets extra te regelen. 👍",
  djHasAll: "Deze DJ heeft alles al bij zich — niets extern nodig. 🎉",
  rentViaCompany: "Niet bij deze DJ — huur via een verhuurbedrijf",
  rentHint: "Kies wat je nog nodig hebt; dit is niet bij de DJ verkrijgbaar.",
  rentAdvice:
    "Advies: dit heeft de DJ niet — huur het bij een externe verhuurpartij hieronder.",
  kindSound: "geluid",
  kindLight: "licht",
  suppliersFor: "Verhuurbedrijven voor {kind}",
  noSuppliers: "Nog geen {kind}-verhuurders in de lijst.",
  viewAllSuppliers: "Bekijk alle {kind}-verhuurbedrijven →",
  perDay: "€{rate} / dag",
  equip: {
    Microfoon: "Microfoon",
    Draaitafel: "Draaitafel",
    Speakers: "Speakers",
    Bass: "Bass",
    Verlichting: "Verlichting",
  } as Record<string, string>,

  // actions.ts
  bookingFailed: "Je aanvraag kon niet worden verstuurd. Probeer het opnieuw.",
}

const en: typeof nl = {
  // page.tsx
  backToDiscover: "← Back to discover",
  verified: "Verified",
  online: "Online",
  bookedViaMyGigs: "{n}× booked via MyGigs",
  responds: "Responds {r}",
  followersInstagram: "{n} on Instagram",
  followersTiktok: "{n} on TikTok",
  reviews: "Reviews",
  anonymous: "Anonymous",
  upcomingShows: "Upcoming shows",
  noPublicShows: "No public performances scheduled.",
  venueTbd: "Venue to be confirmed",
  respWithinMin: "within {n} min",
  respWithinHours: "within {n} hours",
  respWithinDay: "within {n} day",
  respWithinDays: "within {n} days",
  months: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],

  // equipment-planner.tsx
  equipmentHeading: "Equipment",
  availableAtDj: "Available from this DJ",
  availableHint:
    "Tick what you want to (also) rent from the DJ — only this counts towards the price.",
  priceRent: "€ {price} rental",
  included: "included",
  djNoEquipment: "This DJ does not bring their own equipment.",
  needEquipment: "Do you need equipment?",
  yes: "Yes",
  no: "No",
  noNeedNote: "Great — then there's nothing extra to arrange. 👍",
  djHasAll: "This DJ already has everything — nothing external needed. 🎉",
  rentViaCompany: "Not with this DJ — rent via a rental company",
  rentHint: "Pick what you still need; this is not available from the DJ.",
  rentAdvice:
    "Tip: the DJ doesn't have this — rent it from an external rental company below.",
  kindSound: "sound",
  kindLight: "lighting",
  suppliersFor: "Rental companies for {kind}",
  noSuppliers: "No {kind} rental companies in the list yet.",
  viewAllSuppliers: "View all {kind} rental companies →",
  perDay: "€{rate} / day",
  equip: {
    Microfoon: "Microphone",
    Draaitafel: "Turntable",
    Speakers: "Speakers",
    Bass: "Bass",
    Verlichting: "Lighting",
  } as Record<string, string>,

  // actions.ts
  bookingFailed: "Your request could not be sent. Please try again.",
}

export const dict = { nl, en }
