"use client"

import { useFormStatus } from "react-dom"

// Knop die zichzelf uitschakelt zolang het formulier bezig is. Het uitlezen
// door de AI duurt een paar seconden; zonder dit klik je makkelijk drie keer
// en staat dezelfde DJ drie keer in de wachtrij.
export function SubmitButton({
  children,
  busyText,
  className,
  name,
  value,
}: {
  children: React.ReactNode
  busyText: string
  className?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? busyText : children}
    </button>
  )
}
