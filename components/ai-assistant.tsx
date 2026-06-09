"use client"

import { useEffect, useRef, useState } from "react"

type Mode = "dj" | "consument"
type Msg = { role: "user" | "assistant"; content: string }

const WELCOME: Record<Mode, string> = {
  dj:
    "Hoi! Ik help je een sterk DJ-profiel maken. Vertel me kort: welke muziek draai je, " +
    "hoeveel ervaring heb je en in welke regio? Dan geef ik je een artiestnaam, bio en een passende gage.",
  consument:
    "Hoi! Ik help je de juiste DJ vinden. Wat voor gelegenheid is het, in welke stad, welk genre " +
    "en wat is je budget? Dan zoek ik passende DJ's binnen je prijsklasse.",
}

const TABS: { value: Mode; label: string }[] = [
  { value: "consument", label: "DJ vinden" },
  { value: "dj", label: "Profiel-hulp" },
]

export function AiAssistant({ defaultMode }: { defaultMode: Mode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset het gesprek wanneer je van modus wisselt.
  useEffect(() => {
    setMessages([{ role: "assistant", content: WELCOME[mode] }])
  }, [mode])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, messages: next }),
      })
      const data = await res.json()
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            data.reply ?? "Er ging iets mis. Probeer het zo nog eens.",
        },
      ])
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Er ging iets mis met de verbinding. Probeer het opnieuw.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="AI-hulp openen"
          className="fixed bottom-20 right-4 z-[1200] flex items-center gap-2 rounded-full bg-brand px-4 py-3 font-medium text-black shadow-lg transition hover:bg-brand-strong lg:bottom-6 lg:right-6"
        >
          <SparkleIcon className="h-5 w-5" />
          AI-hulp
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-3 bottom-20 z-[1200] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] lg:max-h-[560px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <SparkleIcon className="h-5 w-5 text-brand" />
              <span className="text-sm font-semibold">MyGigs AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 border-b border-border bg-surface-2 p-1.5">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setMode(t.value)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === t.value
                    ? "bg-brand text-black"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-brand text-black"
                      : "bg-surface-2 text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
                  Aan het denken…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Typ je vraag…"
              className="input max-h-28 flex-1 resize-none py-2.5 text-sm"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="h-10 flex-none rounded-full bg-brand px-4 text-sm font-medium text-black transition hover:bg-brand-strong disabled:opacity-40"
            >
              Stuur
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
      <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14Z" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
