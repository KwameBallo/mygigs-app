type IconProps = { className?: string }

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function MapIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  )
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h12" />
    </svg>
  )
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </svg>
  )
}

export function EuroIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M16 7a5.5 5.5 0 0 0-8 7 5.5 5.5 0 0 0 8 3.5" />
      <path d="M4 10.5h7M4 13.5h6" />
    </svg>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.7 1.6 1.6 0 0 1-3.2 0 1.6 1.6 0 0 0-2.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-.7-2.7 1.6 1.6 0 0 1 0-3.2 1.6 1.6 0 0 0 .7-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-.7 1.6 1.6 0 0 1 3.2 0 1.6 1.6 0 0 0 2.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8Z" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function SpeakerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <circle cx="12" cy="15" r="3.5" />
      <circle cx="12" cy="6.5" r="1.2" />
    </svg>
  )
}

export function TicketIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M14 6.5v11" strokeDasharray="2 2" />
    </svg>
  )
}

export function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M18 8a4 4 0 0 1 0 8" />
      <path d="M7 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2.5" />
    </svg>
  )
}

export type IconName =
  | "map"
  | "calendar"
  | "dashboard"
  | "heart"
  | "user"
  | "chat"
  | "euro"
  | "settings"
  | "clock"
  | "speaker"
  | "ticket"
  | "megaphone"

export function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "map":
      return <MapIcon className={className} />
    case "calendar":
      return <CalendarIcon className={className} />
    case "dashboard":
      return <DashboardIcon className={className} />
    case "heart":
      return <HeartIcon className={className} />
    case "user":
      return <UserIcon className={className} />
    case "chat":
      return <ChatIcon className={className} />
    case "euro":
      return <EuroIcon className={className} />
    case "settings":
      return <SettingsIcon className={className} />
    case "clock":
      return <ClockIcon className={className} />
    case "speaker":
      return <SpeakerIcon className={className} />
    case "ticket":
      return <TicketIcon className={className} />
    case "megaphone":
      return <MegaphoneIcon className={className} />
  }
}
