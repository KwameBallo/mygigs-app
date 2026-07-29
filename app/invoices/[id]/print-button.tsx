"use client"

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium transition hover:border-brand/50 print:hidden"
    >
      {label}
    </button>
  )
}
