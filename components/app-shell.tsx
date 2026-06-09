import Link from "next/link"
import { Logo } from "@/components/logo"
import {
  SidebarNav,
  BottomNav,
  type NavItem,
  type NavSection,
} from "@/components/sidebar-nav"
import { LogoutIcon } from "@/components/icons"
import { getProfile } from "@/lib/auth"
import { getUnreadCount } from "@/lib/data/messages"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const isArtist = profile?.role === "artist" || profile?.role === "both"
  const isBooker =
    !profile || profile.role === "booker" || profile.role === "both"
  const unread = profile ? await getUnreadCount(profile.id) : 0

  const items = {
    discover: { href: "/discover", label: "Ontdek", icon: "map" } as NavItem,
    bookings: {
      href: "/bookings",
      label: "Boekingen",
      icon: "calendar",
    } as NavItem,
    messages: {
      href: "/messages",
      label: "Berichten",
      icon: "chat",
      badge: unread,
    } as NavItem,
    favorites: {
      href: "/favorites",
      label: "Favorieten",
      icon: "heart",
    } as NavItem,
    suppliers: {
      href: "/suppliers",
      label: "Apparatuur",
      icon: "speaker",
    } as NavItem,
    events: {
      href: "/events",
      label: "Agenda",
      icon: "ticket",
    } as NavItem,
    manageEvents: {
      href: "/events/manage",
      label: "Mijn events",
      icon: "calendar",
    } as NavItem,
    advertise: {
      href: "/advertise",
      label: "Adverteren",
      icon: "megaphone",
    } as NavItem,
    dashboard: {
      href: "/dashboard",
      label: "Dashboard",
      icon: "dashboard",
    } as NavItem,
    availability: {
      href: "/availability",
      label: "Agenda",
      icon: "clock",
    } as NavItem,
    earnings: {
      href: "/earnings",
      label: "Verdiensten",
      icon: "euro",
    } as NavItem,
    profile: { href: "/profile", label: "Mijn profiel", icon: "user" } as NavItem,
    settings: {
      href: "/settings",
      label: "Instellingen",
      icon: "settings",
    } as NavItem,
  }

  const sections: NavSection[] = []
  if (isArtist) {
    sections.push({
      title: "Artiest",
      items: [items.dashboard, items.availability, items.earnings, items.profile],
    })
  }
  sections.push({
    title: isArtist ? "Algemeen" : undefined,
    items: isBooker
      ? [
          items.discover,
          items.events,
          items.bookings,
          items.messages,
          items.favorites,
          items.suppliers,
        ]
      : [items.discover, items.events, items.messages, items.suppliers],
  })
  sections.push({
    title: "Organiseren",
    items: [items.manageEvents, items.advertise],
  })
  sections.push({ title: "Account", items: [items.settings] })

  const bottomItems: NavItem[] = isArtist
    ? [
        items.dashboard,
        items.availability,
        items.messages,
        items.earnings,
        items.profile,
      ]
    : [items.discover, items.bookings, items.messages, items.favorites]

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-none flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <SidebarNav sections={sections} />
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
          <BottomNav items={bottomItems} />
        </div>
      </div>
    </div>
  )
}
