import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { INSIGHTS_SYSTEM, insightsUserPrompt } from "@/lib/prompts"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-opus-4-7"

type InEntry = {
  date: string
  gratitude: string[]
  highlights: string[]
  affirmation: string
  tomorrowGreat: string[]
  improvement: string
  mood: number | null
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt. Bitte in .env.local hinterlegen." },
      { status: 500 },
    )
  }

  let body: { entries?: InEntry[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 })
  }

  const entries = (body.entries ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  if (entries.length < 2) {
    return NextResponse.json(
      { error: "Mindestens 2 Einträge nötig für eine Reflexion." },
      { status: 400 },
    )
  }

  const client = new Anthropic({ apiKey })

  let raw: string
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.5,
      system: INSIGHTS_SYSTEM,
      messages: [{ role: "user", content: insightsUserPrompt(entries) }],
    })
    raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
  } catch (err) {
    return NextResponse.json(
      { error: "Anthropic-Aufruf fehlgeschlagen.", detail: String(err) },
      { status: 502 },
    )
  }

  const parsed = safeParse(raw)
  if (!parsed) {
    return NextResponse.json(
      { error: "Antwort konnte nicht als JSON gelesen werden.", raw: raw.slice(0, 500) },
      { status: 502 },
    )
  }
  return NextResponse.json(parsed)
}

function safeParse(raw: string) {
  let text = raw.trim()
  if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  const s = text.indexOf("{")
  const e = text.lastIndexOf("}")
  if (s === -1 || e === -1) return null
  try {
    const o = JSON.parse(text.slice(s, e + 1))
    return {
      title: String(o.title ?? "Deine Woche"),
      patterns: String(o.patterns ?? ""),
      energy: String(o.energy ?? ""),
      invitation: String(o.invitation ?? ""),
      averageMood: typeof o.averageMood === "number" ? o.averageMood : null,
    }
  } catch {
    return null
  }
}
