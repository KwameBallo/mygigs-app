const nl = {
  heading: "Nieuwe bevestigingslink",
  intro:
    "Werkte de knop in je mail niet, of is de link verlopen? Vul je e-mailadres in, dan sturen we je een nieuwe.",
  emailLabel: "E-mailadres",
  send: "Stuur een nieuwe link",
  sending: "Versturen…",
  // Bewust neutraal geformuleerd: we bevestigen niet of het adres bestaat en
  // ook niet of het al bevestigd is (anti-enumeratie), net als bij het
  // wachtwoord vergeten-scherm.
  sent: "Als er een account bij dit e-mailadres hoort dat nog bevestigd moet worden, hebben we je een nieuwe link gestuurd. Kijk ook even in je spam-map.",
  error: "Er ging iets mis. Probeer het zo opnieuw.",
  // Supabase begrenst het aantal mails per uur. Dan is opnieuw klikken zinloos.
  tooMany:
    "Je hebt net al een link aangevraagd. Wacht een paar minuten en probeer het daarna opnieuw.",
  back: "Terug naar inloggen",
}

const en: typeof nl = {
  heading: "New confirmation link",
  intro:
    "Did the button in your email not work, or has the link expired? Enter your email address and we'll send you a new one.",
  emailLabel: "Email address",
  send: "Send a new link",
  sending: "Sending…",
  sent: "If there's an account for this email address that still needs confirming, we've sent you a new link. Please check your spam folder too.",
  error: "Something went wrong. Please try again.",
  tooMany:
    "You just requested a link. Please wait a few minutes and try again.",
  back: "Back to login",
}

export const dict = { nl, en }
