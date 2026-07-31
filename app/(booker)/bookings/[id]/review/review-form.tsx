"use client"

import { useActionState, useState } from "react"
import { submitReview, type ReviewState } from "./actions"
import type { Dict } from "./i18n"

export function ReviewForm({
  bookingId,
  t,
}: {
  bookingId: string
  t: Dict
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReview,
    {},
  )
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)

  const errorMsg =
    state.error === "rating"
      ? t.errRating
      : state.error === "generic"
        ? t.errGeneric
        : null

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="text-sm font-medium">{t.ratingLabel}</p>
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n}`}
                className={`text-3xl leading-none transition ${
                  active ? "text-brand" : "text-border hover:text-muted"
                }`}
              >
                ★
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-muted">{t.ratingHint}</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t.commentLabel}</span>
        <textarea
          name="comment"
          rows={4}
          maxLength={1000}
          placeholder={t.commentPlaceholder}
          className="resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
      </label>

      {errorMsg && (
        <p className="text-sm text-red-400" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  )
}
