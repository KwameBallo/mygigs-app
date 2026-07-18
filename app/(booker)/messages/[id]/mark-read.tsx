"use client"

import { useEffect } from "react"
import { markConversationRead } from "./actions"

// Markeert het gesprek als gelezen zodra het geopend wordt, en laat de action
// de ongelezen-badge in de zijbalk verversen.
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationRead(conversationId)
  }, [conversationId])
  return null
}
