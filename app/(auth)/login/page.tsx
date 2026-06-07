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
              ? "Boek artiesten of word zelf geboekt."
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
                <legend className="mb-1 text-sm font-medium">Ik wil...</legend>
                <div className="grid grid-cols-2 gap-2">
                  <RoleOption
                    value="booker"
                    title="Boeken"
                    desc="Artiesten vinden"
                    defaultChecked
                  />
                  <RoleOption
                    value="artist"
                    title="Optreden"
                    desc="Geboekt worden"
                  />
                </div>
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
    <label className="cursor-pointer rounded-xl border border-border bg-surface-2 p-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand/10">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-muted">{desc}</span>
    </label>
  )
}
