import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { updateAccount } from "./actions"

const ROLE_LABEL: Record<string, string> = {
  booker: "Boeker",
  artist: "Artiest",
  both: "Boeker & artiest",
  admin: "Beheerder",
}

export default async function SettingsPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/settings")

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <form action={updateAccount} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Naam</span>
            <input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Je naam"
              className="input h-11"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">E-mail</span>
            <input
              value={profile.email ?? ""}
              disabled
              className="input h-11 opacity-60"
            />
          </label>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Rol:</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          </div>
          <button
            type="submit"
            className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
          >
            Opslaan
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Sessie</h2>
        <p className="mt-1 text-sm text-muted">
          Log uit op dit apparaat.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="h-11 rounded-full border border-border px-6 font-medium transition hover:border-red-500/50 hover:text-red-400"
          >
            Uitloggen
          </button>
        </form>
      </section>
    </main>
  )
}
