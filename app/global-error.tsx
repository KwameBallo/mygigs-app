"use client"

// Vangnet voor fouten in de root-layout. Eigen html/body en inline stijlen,
// want de app-stijlen zijn hier mogelijk niet geladen. Toont geen details.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body
        style={{
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Er ging iets mis
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#a1a1aa" }}>
            Probeer het later opnieuw.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#FF6A00",
              color: "#000",
              border: "none",
              borderRadius: "999px",
              padding: "0.6rem 1.5rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  )
}
