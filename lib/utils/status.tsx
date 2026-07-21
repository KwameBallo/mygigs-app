"use client"

import type { Database } from "@/types/database"
import { useT } from "@/components/i18n-provider"

type BookingStatus = Database["public"]["Enums"]["booking_status"]

export const STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  accepted: "border-green-500/40 bg-green-500/10 text-green-300",
  declined: "border-red-500/40 bg-red-500/10 text-red-300",
  cancelled: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  completed: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  paid: "border-brand/40 bg-brand/10 text-brand",
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useT()
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {t.status[status]}
    </span>
  )
}
