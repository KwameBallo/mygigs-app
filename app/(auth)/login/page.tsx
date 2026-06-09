import Link from "next/link"
import { Logo } from "@/components/logo"
import { signIn, signUp } from "./actions"

type SearchParams = Promise<{
  mode?: string
  error?: string
  message?: string
}>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { mode, error, message } = await searchParams
  const isSignup = mode === "signup"

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            {isSignup ? "Maak je account" : "Welkom terug"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isSignup
              ? "Kies hoe je MyGigs gebruikt: als consument of als DJ."
              : "Log in om verder te gaan."}
          </p>
        </div>

        {message === "check-email" && (
          <div className="mb-4 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
            Check je mail om je account te bevestigen, daarna kun je inloggen.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          action={isSignup ? signUp : signIn}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
        >
          {isSignup && (
            <>
              <Field label="Naam">
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="Jouw naam of artiestennaam"
                  className="input"
                />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">
                  Wat ben jij?
                </legend>
                <div className="grid grid-cols-1 gap-2">
                  <RoleOption
                    value="booker"
                    title="Consument"
                    desc="Ontdek feesten en boek DJ's voor je eigen event"
                    defaultChecked
                  />
                  <RoleOption
                    value="artist"
                    title="DJ / Artiest"
                    desc="Maak een profiel aan en word geboekt"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  Je kunt later altijd ook DJ worden vanuit je account.
                </p>
              </fieldset>
            </>
          )}
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jij@voorbeeld.nl"
              className="input"
            />
          </Field>
          <Field label="Wachtwoord">
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              className="input"
            />
          </Field>
          <button
            type="submit"
            className="mt-2 rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
          >
            {isSignup ? "Account maken" : "Inloggen"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isSignup ? (
            <>
              Heb je al een account?{" "}
              <Link href="/login" className="font-medium text-brand">
                Inloggen
              </Link>
            </>
          ) : (
            <>
              Nog geen account?{" "}
              <Link href="/login?mode=signup" className="font-medium text-brand">
                Aanmelden
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function RoleOption({
  value,
  title,
  desc,
  defaultChecked,
}: {
  value: string
  title: string
  desc: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5 transition has-[:checked]:border-brand has-[:checked]:bg-brand/10">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="mt-0.5 h-4 w-4 flex-none rounded-full border border-border peer-checked:border-[6px] peer-checked:border-brand" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
    </label>
  )
}
