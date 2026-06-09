import { NextResponse } from "next/server"
import { getArtists } from "@/lib/data/artists"
import {
  assistantReply,
  type AssistantMode,
  type ChatMessage,
  type DjOption,
} from "@/lib/ai/assistant"

export async function POST(req: Request) {
  let body: { mode?: string; messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const mode: AssistantMode = body.mode === "dj" ? "dj" : "consument"
  const messages = Array.isArray(body.messages) ? body.messages : []
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
