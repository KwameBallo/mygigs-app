// Detecteert pogingen om persoonlijke contactgegevens te delen in de chat,
// zodat artiest en consument niet buiten MyGigs om een deal sluiten.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

// Telefoonnummer: een reeks die (los van +, spaties, streepjes, haakjes en
// punten) uit 9 t/m 15 cijfers bestaat.
const PHONE = /(?:\+|00)?(?:[\s().-]*\d){9,}/

// Pogingen om het gesprek naar buiten het platform te verplaatsen.
const KEYWORDS: RegExp[] = [
  /whats\s?app/i,
  /\btikkie\b/i,
  /\bsnapchat\b/i,
  /\btelegram\b/i,
  /\bsignal\b/i,
  /\bbel\s?(me|je|mij)\b/i,
  /\bmail\s?(me|je|mij)\b/i,
  /\bmailen\b/i,
  /\bappen\b/i,
  /\bapp\s?(me|je|mij)\b/i,
  /buiten\s+mygigs/i,
  /\bcontant\b/i,
]

export type ContactScan = { flagged: boolean; reasons: string[] }

export function scanForContactInfo(text: string): ContactScan {
  const reasons: string[] = []

  if (EMAIL.test(text)) reasons.push("e-mailadres")

  const phoneMatch = text.match(PHONE)
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, "")
    if (digits.length >= 9 && digits.length <= 15) {
      reasons.push("telefoonnummer")
    }
  }

  if (KEYWORDS.some((re) => re.test(text))) {
    reasons.push("contact buiten het platform")
  }

  return { flagged: reasons.length > 0, reasons }
}
