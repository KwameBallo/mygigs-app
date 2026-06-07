import { AppShell } from "@/components/app-shell"

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
