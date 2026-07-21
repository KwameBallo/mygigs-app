// Woordenboeken per taal. Fase 1: header + homepage. Wordt per fase uitgebreid.
// De merkslogan "Be the star you want to be" blijft in beide talen gelijk.

const nl = {
  header: {
    discover: "Ontdek",
    business: "Zakelijk",
    login: "Inloggen",
    signup: "Aanmelden",
    logout: "Uitloggen",
    dashboard: "Dashboard",
    bookings: "Boekingen",
  },
  home: {
    brandTagline: "Het nummer 1 boekingsplatform.",
    bookDj: "Boek een DJ",
    becomeDj: "Word DJ",
    toDashboard: "Naar dashboard",
    card1Tag: "Voor organisatoren",
    card1Title: "Ontdek & boek",
    card1Body:
      "Blader door de agenda met feesten en DJ's bij jou in de buurt. Boek een DJ voor je eigen event. Filter op genre, stad, datum en budget.",
    card1Cta: "Ontdek feesten",
    card2Tag: "Voor DJ's",
    card2Title: "Word geboekt",
    card2Body:
      "Maak een DJ-profiel aan, toon je demo's en volgers, en ontvang boekingsaanvragen. Aanmelden is gratis: MyGigs verdient 7% per boeking.",
    card2Cta: "Word DJ",
    card3Tag: "Voor bedrijven",
    card3Title: "Zakelijk boeken",
    card3Body:
      "Boek DJ's voor je bedrijfsevent met factuur op naam, BTW-aftrek en één aanspreekpunt. Sla je factuurgegevens eenmalig op.",
    card3Cta: "Naar zakelijk",
    featuredTitle: "Uitgelichte DJ's",
    viewAll: "Bekijk alles",
    step1Title: "Vind je match",
    step1Body:
      "Zoek op genre, stad, datum en budget. Zie rating, reviews en demo's voordat je boekt.",
    step2Title: "Boek direct",
    step2Body:
      "Stuur een aanvraag met datum en locatie. De DJ accepteert, jij betaalt veilig.",
    step3Title: "Veilige uitbetaling",
    step3Body:
      "Je geld staat in escrow tot na het optreden. 7% servicekosten, verder geen verrassingen.",
    ctaTitle: "Klaar om te beginnen?",
    ctaBody:
      "Maak een profiel aan en ontvang je eerste boekingsaanvraag. Aanmelden is gratis.",
    ctaButton: "Aan de slag",
    footer: "MyGigs. Het boekingsplatform voor DJ's en events.",
  },
}

const en: typeof nl = {
  header: {
    discover: "Discover",
    business: "Business",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    dashboard: "Dashboard",
    bookings: "Bookings",
  },
  home: {
    brandTagline: "The number 1 booking platform.",
    bookDj: "Book a DJ",
    becomeDj: "Become a DJ",
    toDashboard: "To dashboard",
    card1Tag: "For organisers",
    card1Title: "Discover & book",
    card1Body:
      "Browse the calendar of parties and DJs near you. Book a DJ for your own event. Filter by genre, city, date and budget.",
    card1Cta: "Discover events",
    card2Tag: "For DJs",
    card2Title: "Get booked",
    card2Body:
      "Create a DJ profile, show your demos and followers, and receive booking requests. Signing up is free: MyGigs earns 7% per booking.",
    card2Cta: "Become a DJ",
    card3Tag: "For businesses",
    card3Title: "Business bookings",
    card3Body:
      "Book DJs for your company event with a proper invoice, VAT deduction and a single point of contact. Save your billing details once.",
    card3Cta: "To business",
    featuredTitle: "Featured DJs",
    viewAll: "View all",
    step1Title: "Find your match",
    step1Body:
      "Search by genre, city, date and budget. See rating, reviews and demos before you book.",
    step2Title: "Book directly",
    step2Body:
      "Send a request with date and location. The DJ accepts, you pay securely.",
    step3Title: "Secure payout",
    step3Body:
      "Your money stays in escrow until after the gig. 7% service fee, no other surprises.",
    ctaTitle: "Ready to get started?",
    ctaBody:
      "Create a profile and receive your first booking request. Signing up is free.",
    ctaButton: "Get started",
    footer: "MyGigs. The booking platform for DJs and events.",
  },
}

export const dictionaries = { nl, en }
export type Dictionary = typeof nl
