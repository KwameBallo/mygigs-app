import Link from "next/link"
import { Logo } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"

export async function SiteHeader() {
  const [profile, { locale, t }] = await Promise.all([getProfile(), getI18n()])
  const isArtist = profile?.role === "artist" || profile?.role === "both"

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {/* DJ's browsen niet zelf op Ontdek. */}
          {!isArtist && (
            <Link
              href="/discover"
              className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
            >
              {t.header.discover}
            </Link>
          )}
          <Link
            href="/zakelijk"
            className="hidden rounded-full px-3 py-2 text-muted transition hover:text-foreground sm:block"
          >
            {t.header.business}
          </Link>
          {profile ? (
            <>
              {isArtist && (
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
                >
                  {t.header.dashboard}
                </Link>
              )}
              <LanguageSwitcher locale={locale} />
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-border bg-surface px-4 py-2 font-medium transition hover:border-brand/50"
                >
                  {t.header.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <LanguageSwitcher locale={locale} />
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
              >
                {t.header.login}
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-brand px-4 py-2 font-medium text-black transition hover:bg-brand-strong"
              >
                {t.header.signup}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
