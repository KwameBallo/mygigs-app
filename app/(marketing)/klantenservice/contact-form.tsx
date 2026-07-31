"use client"

import { useActionState } from "react"
import { submitSupportMessage, type SupportState } from "./actions"
import type { Dict } from "./i18n"

export function ContactForm({
  t,
  intro,
}: {
  t: Dict["form"]
  intro: string
}) {
  const [state, action, pending] = useActionState<SupportState, FormData>(
    submitSupportMessage,
    {},
  )

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/10 p-6">
        <p className="font-semibold text-brand">{t.successTitle}</p>
        <p className="mt-1 text-sm text-muted">{t.successBody}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Honeypot — verborgen voor mensen, ingevuld door bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t.name}</span>
          <input
            name="name"
            required
            maxLength={100}
            placeholder={t.namePlaceholder}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t.email}</span>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder={t.emailPlaceholder}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t.subject}</span>
        <input
          name="subject"
          maxLength={120}
          placeholder={t.subjectPlaceholder}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t.message}</span>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={2000}
          placeholder={t.messagePlaceholder}
          className="resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted">{intro}</p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? t.sending : t.send}
        </button>
      </div>
    </form>
  )
}
