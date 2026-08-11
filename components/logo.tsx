import Link from "next/link"

// Merk-lockup: kader-met-ster (het platform + de ster die schittert) naast het
// woordmerk. De mark gebruikt currentColor voor het kader (wit op donker) en de
// brand-oranje #FF6500 voor de ster; het woordmerk staat in Helvetica Bold,
// exact zoals het merkboard.
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="MyGigs"
      className="inline-flex items-center gap-2.5"
    >
      <svg
        viewBox="0 0 800 800"
        className="h-8 w-8 flex-none"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={52}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M120 275V154Q120 120 154 120H275" />
          <path d="M525 120H646Q680 120 680 154V275" />
          <path d="M680 525V646Q680 680 646 680H525" />
          <path d="M275 680H154Q120 680 120 646V525" />
        </g>
        <path
          fill="#FF6500"
          d="M400 180C410 300 500 390 620 400C500 410 410 500 400 620C390 500 300 410 180 400C300 390 390 300 400 180Z"
        />
      </svg>
      <span
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        My<span style={{ color: "#FF6500" }}>Gigs</span>
      </span>
    </Link>
  )
}
