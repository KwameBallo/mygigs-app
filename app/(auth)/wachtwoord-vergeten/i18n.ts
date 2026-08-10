const nl = {
  heading: "Wachtwoord vergeten",
  intro:
    "Vul je e-mailadres in. We sturen je een link waarmee je een nieuw wachtwoord instelt.",
  emailLabel: "E-mailadres",
  send: "Stuur resetlink",
  sending: "Versturen…",
  // Bewust neutraal geformuleerd (geen bevestiging dat het account bestaat).
  sent: "Als er een account bij dit e-mailadres hoort, hebben we je een resetlink gestuurd. Check je inbox — en je spam-map.",
  error: "Er ging iets mis. Probeer het zo opnieuw.",
  back: "Terug naar inloggen",
}

const en: typeof nl = {
  heading: "Forgot password",
  intro:
    "Enter your email address. We'll send you a link to set a new password.",
  emailLabel: "Email address",
  send: "Send reset link",
  sending: "Sending…",
  sent: "If an account exists for this email address, we've sent you a reset link. Check your inbox — and your spam folder.",
  error: "Something went wrong. Please try again.",
  back: "Back to login",
}

export const dict = { nl, en }
