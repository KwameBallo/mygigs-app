import Link from "next/link"

// De gedeelde ster: twee helften — de organisator (currentColor, wit op donker)
// en de DJ (brand-oranje). Los is elke helft incompleet, samen vormen ze één
// ster: "be the star you want to be".
export function StarMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" className={`flex-none ${className}`} aria-hidden="true">
      <path fill="currentColor" d="M386.0 164C377.0 292.738,295.1 389.38,186.0 400C295.1 410.62,377.0 507.262,386.0 636Z" />
      <path fill="#FF6500" d="M414.0 164C423.0 292.738,504.9 389.38,614.0 400C504.9 410.62,423.0 507.262,414.0 636Z" />
    </svg>
  )
}

// Alleen het beeldmerk — voor de balk linksboven, waar de naam al uit de context
// blijkt.
export function LogoMark({
  href = "/",
  className = "h-8 w-8",
}: {
  href?: string
  className?: string
}) {
  return (
    <Link href={href} aria-label="MyGigs" className="inline-flex">
      <StarMark className={className} />
    </Link>
  )
}

// Het volledige merk: ster boven, naam eronder in gespatieerde kapitalen —
// MY in de tekstkleur, GIGS in brand-oranje. De extra text-indent compenseert
// de letterspatie rechts zodat het woord optisch gecentreerd blijft.
export function Logo({
  href = "/",
  size = "sm",
}: {
  href?: string
  size?: "sm" | "lg"
}) {
  const mark = size === "lg" ? "h-12 w-12 sm:h-14 sm:w-14" : "h-8 w-8"
  const word =
    size === "lg"
      ? "text-base sm:text-lg -mt-1"
      : "text-[13px] -mt-0.5"

  return (
    <Link
      href={href}
      aria-label="MyGigs"
      className="inline-flex flex-col items-center leading-none"
    >
      <StarMark className={mark} />
      <span
        className={`${word} font-bold tracking-[0.26em] indent-[0.26em]`}
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        MY<span style={{ color: "#FF6500" }}>GIGS</span>
      </span>
    </Link>
  )
}
