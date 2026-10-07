import type { ImportRij } from "@/lib/leads-csv"

// =============================================================
// De vormen die het importscherm en zijn serveractie delen.
//
// Dit staat met opzet NIET in actions.ts. Een bestand met "use server" mag
// alleen async functies exporteren; zet je er een type bij, dan weigert Next
// het hele bestand en vallen ALLE serveracties in de app uit. Niet alleen die
// van dit scherm: ook accepteren, betalen en annuleren.
//
// Dat is hier één keer misgegaan en het kostte een avond zoeken, want het
// symptoom ("Er ging iets mis" bij het accepteren van een boeking) wijst
// nergens naar de echte oorzaak.
// =============================================================

export type RijUitslag = ImportRij & {
  /** Reden waarom deze rij niet geïmporteerd is, als dat zo is. */
  overgeslagen?: string
}

export type ImportState = {
  fase: "leeg" | "gecontroleerd" | "gedaan"
  fout?: string
  onbekendeKolommen?: string[]
  rijen?: RijUitslag[]
  /** Hoeveel rijen er echt zijn weggeschreven. Alleen in de fase 'gedaan'. */
  toegevoegd?: number
} | null
