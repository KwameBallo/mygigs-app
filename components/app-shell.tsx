import Link from "next/link"
import { Logo } from "@/components/logo"
import { SidebarNav, BottomNav, type NavItem } from "@/components/sidebar-nav"
import { LogoutIcon } from "@/components/icons"
import { getProfile } from "@/lib/auth"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const isArtist = profile?.role === "artist" || profile?.role === "both"

  const items: NavItem[] = [
    { href: "/discover", label: "Zoek", icon: "map" },
    { href: "/bookings", label: "Boekingen", icon: "calendar" },
    ...(isArtist
      ? [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }]
      : []),
  ]

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-none flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-8 flex-1">
          <SidebarNav items={items} />
        </div>
        <div className="border-t border-border pt-4">
          {profile ? (
            <div className="flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-black">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {profile.full_name ?? "Account"}
                </p>
                <p className="truncate text-xs text-muted">{profile.email}</p>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  aria-label="Uitloggen"
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
                >
                  <LogoutIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              Inloggen
            </Link>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Logo />
          {profile ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-border px-3 py-1.5 text-sm"
              >
                Uitloggen
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-black"
            >
              Inloggen
            </Link>
          )}
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav */}
        <div className="border-t border-border bg-surface lg:hidden">
          <BottomNav items={items} />
        </div>
      </div>
    </div>
  )
}
