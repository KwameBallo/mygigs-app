// =============================================================
// De redenen waarom een DJ zich kan afmelden.
//
// Dit stond in actions.ts, maar dat bestand heeft "use server" bovenaan en
// zo'n bestand mag ALLEEN async functies exporteren. Een `export const` daar
// laat Next het hele bestand weigeren, en dan vallen alle acties erin uit:
// accepteren, afwijzen, onderweg melden, inchecken, afmelden.
//
// Het vervelende is dat de bouw gewoon slaagt. Je merkt het pas als een
// gebruiker op een knop drukt en een foutpagina krijgt, en de melding wijst
// nergens naar dit bestand. 8 oktober 2026 kostte dat een avond zoeken.
//
// Types mogen wel in een "use server"-bestand staan, want TypeScript haalt die
// bij het compileren weg. Een const blijft staan en is dus het probleem.
// =============================================================

export const CANCEL_REASONS = [
  "ziekte",
  "ongeval",
  "dubbele-boeking",
  "vervoer",
  "prive",
  "anders",
] as const

export type CancelReason = (typeof CANCEL_REASONS)[number]

export type CancelState = { error?: "reason" | "late" | "generic"; ok?: boolean }
