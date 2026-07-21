import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getArtists } from "@/lib/data/artists"
import { getI18n } from "@/lib/i18n"
import { ShortlistClient } from "./shortlist-client"
import { dict } from "./i18n"

type SearchParams = Promise<{ acts?: string; error?: string }>

export default async function ShortlistPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { acts, error } = await searchParams
  const { locale } = await getI18n()
  const d = dict[locale]
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/shortlist")

  const artists = await getArtists()
  const preselected = (acts ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {d.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {d.intro}
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error === "missing"
            ? d.errorMissing
            : error === "notfound"
              ? d.errorNotfound
              : d.errorGeneric}
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
