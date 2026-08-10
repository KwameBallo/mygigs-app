import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"
import { getGenres } from "@/lib/data/artists"
import { PROVINCE_NAMES } from "@/lib/utils/provinces"
import { savePreferences, skipPreferences } from "./actions"
import { dict } from "./i18n"

export const dynamic = "force-dynamic"

export default async function VoorkeurenPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/voorkeuren")
  if (profile.role === "artist" || profile.role === "both") redirect("/dashboard")

  const { locale } = await getI18n()
  const d = dict[locale]
  const genres = await getGenres()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-2 text-sm text-muted">{d.intro}</p>

      <form action={savePreferences} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{d.province}</span>
          <select
            name="province"
            defaultValue={profile.pref_province ?? ""}
            className="input h-11"
          >
            <option value="">{d.any}</option>
            {PROVINCE_NAMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{d.budget}</span>
          <input
            name="budget"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={profile.pref_budget ?? ""}
            placeholder="500"
            className="input h-11"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{d.genre}</span>
          <select
            name="genre_id"
            defaultValue={profile.pref_genre_id ?? ""}
            className="input h-11"
          >
            <option value="">{d.any}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{d.date}</span>
          <input
            name="date"
            type="date"
            min={today}
            defaultValue={profile.pref_date ?? ""}
            className="input h-11"
          />
        </label>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            className="flex-1 rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
          >
            {d.save}
          </button>
          <button
            formAction={skipPreferences}
            className="rounded-full border border-border px-5 py-3 text-sm text-muted transition hover:text-foreground"
          >
            {d.skip}
          </button>
        </div>
      </form>
    </main>
  )
}
