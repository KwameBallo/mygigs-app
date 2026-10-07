"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { verwerkImport, type ImportState, type RijUitslag } from "./actions"

// =============================================================
// Het formulier voor de lijstimport.
//
// Eén formulier, twee knoppen, één serveractie. Welke knop je indrukt staat in
// het veld 'intent'. Controleren schrijft niets; Toevoegen verschijnt pas
// nadat je gecontroleerd hebt, zodat je niet per ongeluk tweehonderd rijen
// wegschrijft zonder ze gezien te hebben.
//
// De tweede knop stuurt gewoon hetzelfde formulier opnieuw mee. De server
// leest dus opnieuw wat jij ziet, in plaats van te vertrouwen op een lijstje
// dat uit de browser komt.
// =============================================================

function Knop({
  intent,
  kind,
  stijl,
}: {
  intent: "controleren" | "importeren"
  kind: string
  stijl: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={stijl}
    >
      {pending ? "Bezig…" : kind}
    </button>
  )
}

export function ImportForm() {
  const [state, actie] = useActionState<ImportState, FormData>(verwerkImport, null)
  const [csv, setCsv] = useState("")
  const [bestandsnaam, setBestandsnaam] = useState<string | null>(null)
  const [leesFout, setLeesFout] = useState<string | null>(null)

  async function kiesBestand(file: File | null | undefined) {
    setLeesFout(null)
    if (!file) return
    const tekst = await file.text().catch(() => null)
    if (tekst === null) {
      setLeesFout("Het bestand kon niet gelezen worden.")
      return
    }
    setCsv(tekst)
    setBestandsnaam(file.name)
  }

  const rijen = state?.rijen ?? []
  const meeTeller = rijen.filter((r) => r.velden && !r.overgeslagen).length

  return (
    <form action={actie} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Waar komt deze lijst vandaan?</span>
        <input
          name="source_note"
          maxLength={1000}
          placeholder="Bijvoorbeeld: soundcloud.com, zoekopdracht house Amsterdam, 7 oktober"
          className="input"
        />
        <span className="text-xs text-muted">
          Dit komt letterlijk in de uitnodigingsmail te staan, zodat de DJ ziet waar zijn
          gegevens vandaan komen. Staat er een kolom <code>bron</code> in je bestand, dan
          wint die per regel. Zonder allebei gaat een regel niet mee.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">De lijst</span>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              kiesBestand(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          {bestandsnaam ? `Ander bestand kiezen (${bestandsnaam})` : "Kies een CSV-bestand"}
        </label>
        <textarea
          name="csv"
          rows={10}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"naam,email,stad,genres,tarief,instagram,bron"}
          className="input min-h-48 resize-y font-mono text-xs"
        />
        {leesFout && <span className="text-xs text-red-400">{leesFout}</span>}
        <span className="text-xs text-muted">
          Je kunt ook rechtstreeks uit een spreadsheet plakken. Puntkomma&apos;s,
          komma&apos;s en tabs worden alle drie herkend.
        </span>
      </div>

      {state?.fout && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.fout}
        </p>
      )}

      {state?.onbekendeKolommen && state.onbekendeKolommen.length > 0 && (
        <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          Deze kolommen ken ik niet en heb ik overgeslagen:{" "}
          <span className="text-foreground">{state.onbekendeKolommen.join(", ")}</span>
        </p>
      )}

      {state?.fase === "gedaan" && (
        <p className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
          <strong className="font-semibold">{state.toegevoegd}</strong>{" "}
          {state.toegevoegd === 1 ? "DJ staat" : "DJ's staan"} nu in de wachtrij, op
          status nieuw. Er is nog niemand uitgenodigd en niemand staat online.
        </p>
      )}

      {rijen.length > 0 && <Uitslag rijen={rijen} />}

      <div className="flex flex-wrap items-center gap-3">
        <Knop
          intent="controleren"
          kind="Controleren"
          stijl="rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:border-brand/50 disabled:opacity-50"
        />
        {state?.fase === "gecontroleerd" && meeTeller > 0 && (
          <Knop
            intent="importeren"
            kind={`${meeTeller} ${meeTeller === 1 ? "DJ" : "DJ's"} toevoegen`}
            stijl="rounded-full bg-brand px-6 py-3 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-50"
          />
        )}
      </div>
    </form>
  )
}

function Uitslag({ rijen }: { rijen: RijUitslag[] }) {
  const mee = rijen.filter((r) => r.velden && !r.overgeslagen)
  const niet = rijen.length - mee.length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        <span className="text-foreground">{rijen.length}</span> regels gelezen,{" "}
        <span className="text-foreground">{mee.length}</span> kunnen mee,{" "}
        <span className="text-foreground">{niet}</span> niet.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Regel</th>
              <th className="px-3 py-2 font-medium">Naam</th>
              <th className="px-3 py-2 font-medium">Mail</th>
              <th className="px-3 py-2 font-medium">Stand</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((r) => {
              const gaatMee = !!r.velden && !r.overgeslagen
              return (
                <tr key={r.regel} className="border-t border-border align-top">
                  <td className="px-3 py-2 tabular-nums text-muted">{r.regel}</td>
                  <td className="px-3 py-2">{r.velden?.stage_name ?? "–"}</td>
                  <td className="px-3 py-2 text-muted">{r.velden?.email ?? "–"}</td>
                  <td className="px-3 py-2">
                    {gaatMee ? (
                      <span className="text-brand">gaat mee</span>
                    ) : (
                      <span className="text-red-300">
                        {r.overgeslagen ?? r.problemen.join(", ")}
                      </span>
                    )}
                    {r.opmerkingen.length > 0 && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {r.opmerkingen.join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
