import Link from "next/link"
import { Logo } from "@/components/logo"
import {
  SidebarNav,
  BottomNav,
  type NavItem,
  type NavSection,
} from "@/components/sidebar-nav"
import { LogoutIcon, Icon } from "@/components/icons"
import { AiAssistant } from "@/components/ai-assistant"
import { getProfile } from "@/lib/auth"
import { getUnreadCount } from "@/lib/data/messages"
import { getPendingBookingCount } from "@/lib/data/bookings"
import { roleLabel, roleIcon } from "@/lib/roles"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  const isArtist = profile?.role === "artist" || profile?.role === "both"
  const unread = profile ? await getUnreadCount(profile.id) : 0
  // Nieuwe boekingsaanvragen tonen als melding op het DJ-dashboard.
  const pendingBookings =
    profile && isArtist ? await getPendingBookingCount(profile.id) : 0

  const items = {
    home: { href: "/", label: "Beginscherm", icon: "home" } as NavItem,
    discover: { href: "/discover", label: "Ontdek", icon: "map" } as NavItem,
    admin: { href: "/admin", label: "Beheer", icon: "settings" } as NavItem,
    bookings: {
      href: "/bookings",
      label: "Mijn boekingen",
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
      label: "Events",
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
      badge: pendingBookings,
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
    // DJ-kant: volledige cockpit.
    sections.push({
      title: "DJ",
      items: [items.dashboard, items.availability, items.earnings, items.profile],
    })
    sections.push({
      title: "Algemeen",
      items: [items.discover, items.events, items.messages, items.suppliers],
    })
    // "Als klant" — de DJ kan zelf ook DJ's boeken; strikt gescheiden van de
    // binnenkomende aanvragen op het Dashboard.
    sections.push({
      title: "Als klant",
      items: [items.bookings],
    })
    sections.push({
      title: "Organiseren",
      items: [items.manageEvents, items.advertise],
    })
    sections.push({ title: "Account", items: [items.settings] })
  } else {
    // Consument: beginscherm, Ontdek en de eigen boekingen.
    sections.push({ items: [items.home, items.discover, items.bookings] })
    sections.push({ title: "Account", items: [items.settings] })
  }

  if (profile?.role === "admin") {
    sections.push({ title: "Beheer", items: [items.admin] })
  }

  const bottomItems: NavItem[] = isArtist
    ? [
        items.dashboard,
        items.events,
        items.messages,
        items.earnings,
        items.profile,
      ]
    : profile?.role === "admin"
      ? [items.home, items.discover, items.admin]
      : [items.home, items.discover, items.bookings, items.settings]

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-none flex-col border-r border-border bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
          {profile && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
              <Icon name={roleIcon(profile.role)} className="h-3.5 w-3.5" />
              {roleLabel(profile.role)}
            </span>
          )}
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <SidebarNav sections={sections} />
          {profile && !isArtist && (
            <Link
              href="/dj-aanvraag"
              className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted transition hover:border-brand/50 hover:text-foreground"
            >
              <Icon name="user" className="h-5 w-5 flex-none" />
              <span className="flex-1">DJ worden</span>
            </Link>
          )}
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
        <div className="safe-top flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            {profile && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                <Icon name={roleIcon(profile.role)} className="h-3 w-3" />
                {roleLabel(profile.role)}
              </span>
            )}
          </div>
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
        <div className="safe-bottom border-t border-border bg-surface lg:hidden">
          <BottomNav items={bottomItems} />
        </div>
      </div>

      <AiAssistant defaultMode={isArtist ? "dj" : "consument"} />
    </div>
  )
}
