"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon, type IconName } from "@/components/icons"

export type NavItem = {
  href: string
  label: string
  icon: IconName
  badge?: number
}

export type NavSection = { title?: string; items: NavItem[] }

function isActive(pathname: string, href: string) {
  if (href === "/discover")
    return pathname.startsWith("/discover") || pathname.startsWith("/artists")
  return pathname === href || pathname.startsWith(href + "/")
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand/15 text-brand"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 flex-none" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-black">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex items-stretch justify-around">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
              active ? "text-brand" : "text-muted"
            }`}
          >
            <span className="relative">
              <Icon name={item.icon} className="h-5 w-5" />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-black">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
