"use client"

import { deleteAccount } from "./actions"

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (
          !confirm(
            "Weet je zeker dat je je account en al je gegevens permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
      >
        Account verwijderen
      </button>
    </form>
  )
}
