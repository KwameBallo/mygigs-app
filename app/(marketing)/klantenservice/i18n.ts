const nl = {
  metaTitle: "Klantenservice · MyGigs",
  back: "← Terug",
  title: "Klantenservice",
  intro:
    "Hier vind je alles over boeken, betalen, uitbetalingen en je account. Staat je vraag er niet bij? Stuur ons gerust een bericht.",

  categories: [
    { title: "Boeken & betalen", body: "Een DJ vinden, aanvragen en veilig betalen via de app." },
    { title: "Voor DJ's", body: "Uitbetaling, commissie, btw-status en je profiel." },
    { title: "Annuleren & no-show", body: "Wat geldt er bij annuleren of als de DJ niet komt." },
    { title: "Account & privacy", body: "Meldingen, gegevens en je account beheren." },
  ],

  faqTitle: "Veelgestelde vragen",
  faq: [
    {
      q: "Hoe boek ik een DJ?",
      a: "Ga naar Ontdek, kies een DJ die bij je event past en doe een aanvraag met datum en locatie. Zodra de DJ accepteert, betaal je veilig via de app en is de boeking definitief.",
    },
    {
      q: "Hoe werkt de betaling?",
      a: "Betalen gaat digitaal via de app (bijv. iDEAL). MyGigs houdt het bedrag veilig in escrow en betaalt de DJ pas ná het optreden uit — zo zit je aan beide kanten goed.",
    },
    {
      q: "Wanneer krijg ik als DJ uitbetaald?",
      a: "Je ontvangt het bedrag netto, uiterlijk binnen 5 werkdagen na het optreden. MyGigs houdt 7% commissie plus 21% btw in; daarvoor krijg je een aparte commissie-factuur. Zie ook de algemene voorwaarden.",
    },
    {
      q: "Kan ik apparatuur (draaitafel, speakers) bijboeken?",
      a: "Ja. Op het profiel van de DJ vink je aan wat je nodig hebt. Wat een prijs heeft, komt als aparte regel op de verkoopfactuur en telt mee in het totaal.",
    },
    {
      q: "Kan ik een boeking annuleren?",
      a: "De annuleringsvoorwaarden worden bij de boeking getoond. Verschijnt de DJ zonder geldige reden niet, dan krijg je het betaalde bedrag terug.",
    },
    {
      q: "Hoe stel ik als DJ mijn btw-status in?",
      a: "In je facturatie-instellingen geef je aan of je btw-plichtig bent of de kleineondernemersregeling (KOR) gebruikt. Dat bepaalt of er btw op je facturen komt.",
    },
    {
      q: "Hoe zet ik e-mailmeldingen uit?",
      a: "Ga naar Instellingen → E-mailmeldingen en zet ze aan of uit. Belangrijke berichten over je boeking blijven werken.",
    },
    {
      q: "Waar vind ik mijn facturen?",
      a: "Bij je boekingen. Zodra een boeking betaald is, kun je de bijbehorende factuur openen en als PDF opslaan.",
    },
    {
      q: "Hoe verwijder ik mijn account?",
      a: "Dat kan via Instellingen. Je gegevens worden conform de AVG verwijderd of geanonimiseerd; wettelijk verplichte factuurgegevens bewaren we de vereiste termijn.",
    },
  ],

  linksTitle: "Handige links",
  links: [
    { label: "Algemene voorwaarden", href: "/voorwaarden" },
    { label: "Privacybeleid", href: "/privacy" },
  ],

  contactTitle: "Stuur ons een bericht",
  contactIntro: "We reageren meestal binnen 1–2 werkdagen.",
  form: {
    name: "Naam",
    email: "E-mailadres",
    subject: "Onderwerp",
    message: "Je bericht",
    namePlaceholder: "Je naam",
    emailPlaceholder: "naam@voorbeeld.nl",
    subjectPlaceholder: "Waar gaat je vraag over?",
    messagePlaceholder: "Beschrijf je vraag zo duidelijk mogelijk…",
    send: "Versturen",
    sending: "Versturen…",
    successTitle: "Bericht verstuurd",
    successBody: "Bedankt! We hebben je bericht ontvangen en nemen zo snel mogelijk contact op.",
    errRequired: "Vul je naam, e-mailadres en bericht in.",
    errEmail: "Vul een geldig e-mailadres in.",
    errShort: "Je bericht is te kort — geef wat meer details.",
    errRate: "Je hebt te veel berichten verstuurd. Probeer het later opnieuw.",
    errFailed: "Er ging iets mis bij het versturen. Probeer het later opnieuw.",
  },
}

const en: typeof nl = {
  metaTitle: "Customer service · MyGigs",
  back: "← Back",
  title: "Customer service",
  intro:
    "Everything about booking, payments, payouts and your account. Can't find your answer? Send us a message.",

  categories: [
    { title: "Booking & payment", body: "Find a DJ, request and pay securely through the app." },
    { title: "For DJs", body: "Payout, commission, VAT status and your profile." },
    { title: "Cancellation & no-show", body: "What applies when you cancel or the DJ doesn't show." },
    { title: "Account & privacy", body: "Notifications, data and managing your account." },
  ],

  faqTitle: "Frequently asked questions",
  faq: [
    {
      q: "How do I book a DJ?",
      a: "Go to Discover, pick a DJ that fits your event and send a request with date and location. Once the DJ accepts, you pay securely through the app and the booking is confirmed.",
    },
    {
      q: "How does payment work?",
      a: "Payment is digital through the app (e.g. iDEAL). MyGigs holds the amount securely in escrow and only pays the DJ after the gig — protecting both sides.",
    },
    {
      q: "When do I get paid as a DJ?",
      a: "You receive the amount net, at the latest within 5 business days after the gig. MyGigs deducts 7% commission plus 21% VAT, for which you get a separate commission invoice. See also the terms and conditions.",
    },
    {
      q: "Can I add equipment (turntable, speakers)?",
      a: "Yes. On the DJ's profile you tick what you need. Anything with a price appears as a separate line on the sales invoice and is included in the total.",
    },
    {
      q: "Can I cancel a booking?",
      a: "Cancellation terms are shown at the time of booking. If the DJ fails to appear without a valid reason, you get the amount you paid refunded.",
    },
    {
      q: "How do I set my VAT status as a DJ?",
      a: "In your billing settings you indicate whether you charge VAT or use the small-business scheme (KOR). This determines whether VAT is added to your invoices.",
    },
    {
      q: "How do I turn off email notifications?",
      a: "Go to Settings → Email notifications and switch them on or off. Essential messages about your booking keep working.",
    },
    {
      q: "Where do I find my invoices?",
      a: "With your bookings. Once a booking is paid, you can open the invoice and save it as a PDF.",
    },
    {
      q: "How do I delete my account?",
      a: "You can do this via Settings. Your data is deleted or anonymised in line with the GDPR; legally required invoice data is kept for the mandatory period.",
    },
  ],

  linksTitle: "Handy links",
  links: [
    { label: "Terms and conditions", href: "/voorwaarden" },
    { label: "Privacy policy", href: "/privacy" },
  ],

  contactTitle: "Send us a message",
  contactIntro: "We usually reply within 1–2 business days.",
  form: {
    name: "Name",
    email: "Email address",
    subject: "Subject",
    message: "Your message",
    namePlaceholder: "Your name",
    emailPlaceholder: "name@example.com",
    subjectPlaceholder: "What is your question about?",
    messagePlaceholder: "Describe your question as clearly as possible…",
    send: "Send",
    sending: "Sending…",
    successTitle: "Message sent",
    successBody: "Thank you! We've received your message and will get back to you as soon as possible.",
    errRequired: "Please fill in your name, email address and message.",
    errEmail: "Please enter a valid email address.",
    errShort: "Your message is too short — please add some more detail.",
    errRate: "You've sent too many messages. Please try again later.",
    errFailed: "Something went wrong while sending. Please try again later.",
  },
}

export const dict = { nl, en }

export type Dict = typeof nl

