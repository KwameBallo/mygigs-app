import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          My<span className="text-brand">Gigs</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-muted transition hover:text-foreground"
          >
            Inloggen
          </Link>
          <Link
            href="/discover"
            className="rounded-full bg-brand px-4 py-2 font-medium text-black transition hover:bg-brand-strong"
          >
            Vind een artiest
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted">
          Artiesten en DJ&apos;s rechtstreeks boeken
        </span>
        <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Be the star you <span className="text-brand">want to be.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted">
          MyGigs koppelt boekers rechtstreeks aan artiesten. Filter op locatie,
          genre, budget en datum. Boek in een paar tikken. Geen tussenkomst van
          boekingskantoren.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/discover"
            className="rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
          >
            Ontdek artiesten
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-border bg-surface px-6 py-3 font-medium transition hover:border-brand/50"
          >
            Ik ben artiest
          </Link>
        </div>
      </section>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted">
        7% servicekosten per geslaagde boeking. Aanmelden en zoeken is gratis.
      </footer>
    </main>
  );
}
