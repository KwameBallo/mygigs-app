"use client"

import { useEffect } from "react"

// Generieke foutpagina: toont nooit stacktraces of interne details aan de
// gebruiker (ISO 27002 A.8.28 — voorkomen van information disclosure).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error?.message)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Er ging iets mis</h1>
      <p className="mt-2 text-sm text-muted">
        Probeer het opnieuw. Blijft het misgaan? Neem contact op met support.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
      >
        Opnieuw proberen
      </button>
    </main>
  )
}
