import { NextResponse } from "next/server"
import { getArtists } from "@/lib/data/artists"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/ratelimit"
import {
  assistantReply,
  type AssistantMode,
  type ChatMessage,
  type DjOption,
} from "@/lib/ai/assistant"

export async function POST(req: Request) {
  // FIX #10/#11: alleen ingelogde gebruikers + rate limiting. Voorheen kon een
  // anonieme loop de Anthropic-rekening opjagen en de DB belasten.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const rl = await rateLimit(user.id, {
    limit: 20,
    windowSec: 60,
    scope: "assistant",
  })
  if (!rl.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 })
  }

  let body: { mode?: string; messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const mode: AssistantMode = body.mode === "dj" ? "dj" : "consument"
  // Begrens de invoer: hoogstens 20 berichten van elk 2000 tekens.
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-20)
    .map((m) => ({ ...m, content: String(m.content ?? "").slice(0, 2000) }))
  if (messages.length === 0) {
    return NextResponse.json({ error: "no messages" }, { status: 400 })
  }

  // Voor de consument: geef het model echte DJ-opties als context.
  let djs: DjOption[] = []
  if (mode === "consument") {
    const artists = await getArtists()
    djs = artists.slice(0, 40).map((a) => ({
      stage_name: a.stage_name,
      genre: a.genres?.name ?? null,
      city: a.home_city,
      gage: a.base_gage,
      rating: a.rating,
    }))
  }

  const reply = await assistantReply(mode, messages, djs)
  return NextResponse.json({ reply })
}
