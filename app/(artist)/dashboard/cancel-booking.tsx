"use client"

import { useActionState, useState } from "react"
import { useT } from "@/components/i18n-provider"
import { hoursUntil } from "@/lib/time"
import {
  cancelBookingAsArtist,
  CANCEL_REASONS,
  type CancelState,
} from "./actions"

// De afmeldknop bij een aangenomen boeking (huisregel 2).
//
// Bewust onopvallend en niet naast de knop waarmee je accepteert: niemand hoort
// zich per ongeluk af te melden. Het bevestigingsscherm laat eerst zien hoeveel
// uur er nog te gaan zijn en wat dat betekent, want dat is precies de
// informatie waarop iemand zijn beslissing hoort te baseren.
export function CancelBooking({
  bookingId,
  eventDate,
  startTime,
}: {
  bookingId: string
  eventDate: string
  startTime: string | null
}) {
  const { t } = useT()
  const d = t.dashboard
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const [reason, setReason] = useState("")
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelBookingAsArtist,
    {},
  )

  const hours = hoursUntil(eventDate, startTime)
  const late = hours < 24

  const error =
    state.error === "reason"
      ? d.cancelErrorReason
      : state.error
        ? d.cancelErrorGeneric
        : null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto rounded-full px-3 py-2 text-xs font-semibold text-brand underline-offset-2 transition hover:text-brand-strong hover:underline"
      >
        {d.cancelOpen}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.cancelTitle}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <form
        action={action}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
      >
        <input type="hidden" name="booking_id" value={bookingId} />

        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {d.cancelTitle}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {hours >= 0
              ? d.cancelInHours.replace("{h}", String(Math.round(hours)))
              : d.cancelStarted}
          </p>
        </div>

        {/* Wat het betekent. Dit is geen dreigement, maar wel het moment om het
            eerlijk te zeggen: onder de 24 uur is het zichtbaar. */}
        <p
          className={`rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${
            late
              ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
              : "border-border bg-surface-2 text-muted"
          }`}
        >
          {late ? d.cancelLate : d.cancelOnTime}
        </p>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{d.cancelReasonLabel}</span>
          <select
            name="reason_code"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input h-11"
          >
            <option value="">{d.cancelReasonChoose}</option>
            {CANCEL_REASONS.map((code) => (
              <option key={code} value={code}>
                {d.cancelReasons[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{d.cancelNoteLabel}</span>
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            placeholder={d.cancelNotePlaceholder}
            className="input py-2.5"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-none accent-[var(--brand)]"
          />
          <span className="text-muted">{d.cancelConfirm}</span>
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
          >
            {d.cancelBack}
          </button>
          <button
            type="submit"
            disabled={!checked || !reason || pending}
            className="ml-auto rounded-full border border-red-500/50 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
          >
            {pending ? d.cancelBusy : d.cancelSubmit}
          </button>
        </div>
      </form>
    </div>
  )
}
