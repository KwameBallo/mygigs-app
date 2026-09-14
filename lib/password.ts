// De wachtwoordeisen van MyGigs, op één plek.
//
// Zowel het vinkjeslijstje in het scherm als de controle op de server gebruiken
// deze functies. Dat is de hele reden dat dit bestand bestaat: staat de eis op
// twee plekken, dan zie je vroeg of laat een groen vinkje bij een wachtwoord
// dat de server daarna alsnog weigert.

export const PASSWORD_MIN = 12

export type PasswordRuleKey = "length" | "upper" | "lower" | "digit"

export type PasswordCheck = { key: PasswordRuleKey; ok: boolean }

// \p{Lu} en \p{Ll} zijn hoofdletter en kleine letter in élk alfabet, dus ook
// É, Ø of Ł. Met [A-Z] zou een Franse naam in je wachtwoord niet meetellen.
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { key: "length", ok: password.length >= PASSWORD_MIN },
    { key: "upper", ok: /\p{Lu}/u.test(password) },
    { key: "lower", ok: /\p{Ll}/u.test(password) },
    { key: "digit", ok: /\d/.test(password) },
  ]
}

export function passwordOk(password: string): boolean {
  return passwordChecks(password).every((c) => c.ok)
}
