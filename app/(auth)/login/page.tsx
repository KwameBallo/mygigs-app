import Link from "next/link"
import { Logo } from "@/components/logo"
import { signIn, signUp } from "./actions"
import { PasswordFields } from "./password-fields"

type SearchParams = Promise<{
  mode?: string
  type?: string
  error?: string
  message?: string
}>

function loginHref(signup: boolean, dj: boolean) {
  const params = new URLSearchParams()
  if (signup) params.set("mode", "signup")
  if (dj) params.set("type", "dj")
  const query = params.toString()
  return query ? `/login?${query}` : "/login"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { mode, type, error, message } = await searchParams
  const isSignup = mode === "signup"
  const isDj = type === "dj"
  const role = isDj ? "artist" : "booker"

  const title = isSignup
    ? isDj
      ? "Word DJ op MyGigs"
      : "Maak je account"
    : "Welkom terug"
  const subtitle = isSignup
    ? isDj
      ? "Maak een DJ-profiel aan, toon je demo's en word geboekt."
      : "Ontdek feesten en boek DJ's voor je eigen event."
    : isDj
      ? "Log in op je DJ-account."
      : "Log in om DJ's te ontdekken en te boeken."

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>

        {/* Tabs: duidelijke scheiding tussen consument en DJ. */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1 text-sm font-medium">
          <Link
            href={loginHref(isSignup, false)}
            className={`rounded-full px-4 py-2 text-center transition ${
              !isDj
                ? "bg-brand text-black"
                : "text-muted hover:text-foreground"
            }`}
          >
            Organisator
          </Link>
          <Link
            href={loginHref(isSignup, true)}
            className={`rounded-full px-4 py-2 text-center transition ${
              isDj ? "bg-brand text-black" : "text-muted hover:text-foreground"
            }`}
          >
            DJ
          </Link>
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
          {/* De gekozen tab bepaalt de rol — geen losse rolkeuze meer. */}
          <input type="hidden" name="role" value={role} />
          {isSignup && (
            <>
              <Field label="Naam">
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder={isDj ? "Jouw DJ-naam" : "Jouw naam"}
                  className="input"
                />
              </Field>
              {!isDj && (
                <p className="-mt-1 text-xs text-muted">
                  Je kunt later altijd ook DJ worden vanuit je account.
                </p>
              )}
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
          <PasswordFields isSignup={isSignup} />
          {isSignup && (
            <label className="flex items-start gap-2.5 text-sm text-muted">
              <input
                name="accept_terms"
                type="checkbox"
                required
                value="yes"
                className="mt-0.5 h-4 w-4 flex-none accent-brand"
              />
              <span>
                Ik ga akkoord met de{" "}
                <Link
                  href="/voorwaarden"
                  target="_blank"
                  className="font-medium text-brand hover:underline"
                >
                  algemene voorwaarden
                </Link>{" "}
                en het{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-medium text-brand hover:underline"
                >
                  privacybeleid
                </Link>
                .
              </span>
            </label>
          )}
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
              <Link
                href={loginHref(false, isDj)}
                className="font-medium text-brand"
              >
                Inloggen
              </Link>
            </>
          ) : (
            <>
              Nog geen account?{" "}
              <Link
                href={loginHref(true, isDj)}
                className="font-medium text-brand"
              >
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
