import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"
import { Logo } from "@/components/logo"
import { signInAdmin } from "./actions"
import { dict } from "../i18n"

export const dynamic = "force-dynamic"

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const profile = await getProfile()
  if (profile?.role === "admin") redirect("/admin")

  const { error } = await searchParams
  const { locale } = await getI18n()
  const d = dict[locale]
  const errMap: Record<string, string> = {
    signin: d.loginErrSignin,
    notadmin: d.loginErrNotAdmin,
    "too-many": d.loginErrTooMany,
  }
  const msg = error ? errMap[error] : null

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo />
          <span className="mt-3 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            {d.badge}
          </span>
        </div>
        <h1 className="mt-6 text-center text-2xl font-semibold tracking-tight">
          {d.loginTitle}
        </h1>
        <p className="mt-1 text-center text-sm text-muted">{d.loginSubtitle}</p>

        {msg && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {msg}
          </div>
        )}

        <form
          action={signInAdmin}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.emailLabel}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.passwordLabel}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
          >
            {d.loginBtn}
          </button>
        </form>
      </div>
    </div>
  )
}
