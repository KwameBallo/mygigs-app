import Link from "next/link"
import { Logo } from "@/components/logo"
import { getProfile } from "@/lib/auth"

export async function SiteHeader() {
  const profile = await getProfile()
  const isArtist = profile?.role === "artist" || profile?.role === "both"

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/discover"
            className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
          >
            Ontdek
          </Link>
          {profile ? (
            <>
              {isArtist && (
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/bookings"
                className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
              >
                Boekingen
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-border bg-surface px-4 py-2 font-medium transition hover:border-brand/50"
                >
                  Uitloggen
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-muted transition hover:text-foreground"
              >
                Inloggen
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-brand px-4 py-2 font-medium text-black transition hover:bg-brand-strong"
              >
                Aanmelden
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
