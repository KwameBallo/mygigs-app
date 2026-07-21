"use client"

import { useT } from "@/components/i18n-provider"
import { deleteAccount } from "./actions"
import { dict } from "./i18n"

export function DeleteAccountButton() {
  const { locale } = useT()
  const d = dict[locale]
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (!confirm(d.deleteAccountConfirm)) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
      >
        {d.deleteAccountButton}
      </button>
    </form>
  )
}
