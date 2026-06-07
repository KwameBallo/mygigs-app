"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function sendMessage(formData: FormData) {
  const conversationId = String(formData.get("conversation_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!conversationId || !body) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  })

  revalidatePath(`/messages/${conversationId}`)
}
