import { AppShell } from "@/components/app-shell"

export default function BookerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
