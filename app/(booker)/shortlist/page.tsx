import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getArtists } from "@/lib/data/artists"
import { ShortlistClient } from "./shortlist-client"

type SearchParams = Promise<{ acts?: string; error?: string }>

export default async function ShortlistPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { acts, error } = await searchParams
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/shortlist")

  const artists = await getArtists()
  const preselected = (acts ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Vraag meerdere DJ&apos;s tegelijk aan
      </h1>
      <p className="mt-2 text-sm text-muted">
        Stel een shortlist samen en stuur in één keer dezelfde aanvraag naar
        alle geselecteerde DJ&apos;s.
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error === "missing"
            ? "Selecteer minstens één DJ en kies een datum."
            : error === "notfound"
              ? "De geselecteerde DJ's zijn niet gevonden."
              : "Er ging iets mis. Probeer het opnieuw."}
        </div>
      )}

      <div className="mt-8">
        <ShortlistClient
          artists={artists}
          preselected={preselected}
          company={{
            name: profile.company_name,
            vat: profile.vat_number,
            email: profile.invoice_email,
          }}
        />
      </div>
    </main>
  )
}
