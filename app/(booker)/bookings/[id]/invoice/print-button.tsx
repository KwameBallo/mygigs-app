"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong print:hidden"
    >
      Download / print PDF
    </button>
  )
}
