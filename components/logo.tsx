import Link from "next/link"

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-lg font-semibold tracking-tight">
      My<span className="text-brand">Gigs</span>
    </Link>
  )
}
