import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { STRUCTURE_SYSTEM, structureUserPrompt } from "@/lib/prompts"
import type { StructuredFields } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-opus-4-7"

/**
 * POST /api/structure
 * Body: { transcript: string }
 * Antwort: StructuredFields
 *
 * Claude extrahiert die 6-Minuten-Tagebuch-Felder aus dem Transkript.
 * Strenge JSON-Antwort (per System-Prompt erzwungen + Parser-Fallback).
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt. Bitte in .env.local hinterlegen." },
      { status: 500 },
    )
  }

  let body: { transcript?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 })
  }

  const transcript = (body.transcript ?? "").trim()
  if (!transcript) {
    return NextResponse.json({ error: "Transkript ist leer." }, { status: 400 })
  }
  if (transcript.length > 12000) {
    return NextResponse.json(
      { error: "Transkript zu lang (max 12000 Zeichen)." },
      { status: 413 },
    )
  }

  const client = new Anthropic({ apiKey })

  let raw: string
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.2,
      system: STRUCTURE_SYSTEM,
      messages: [{ role: "user", content: structureUserPrompt(transcript) }],
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

  const parsed = safeParseStructured(raw)
  if (!parsed) {
    return NextResponse.json(
      { error: "Antwort konnte nicht als JSON gelesen werden.", raw: raw.slice(0, 500) },
      { status: 502 },
    )
  }

  return NextResponse.json(parsed)
}

function safeParseStructured(raw: string): StructuredFields | null {
  // Fallback: extrahiere JSON-Block, falls Modell trotz Anweisung Zusatztext liefert.
  let text = raw.trim()
  if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  const slice = text.slice(start, end + 1)
  try {
    const obj = JSON.parse(slice) as Partial<StructuredFields>
    return normalize(obj)
  } catch {
    return null
  }
}

function normalize(o: Partial<StructuredFields>): StructuredFields {
  const arr = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x) => typeof x === "string").map((x) => (x as string).trim()).filter(Boolean).slice(0, 3)
      : []
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")
  const moodRaw = (o as { mood?: unknown }).mood
  const mood =
    typeof moodRaw === "number" && moodRaw >= 1 && moodRaw <= 10
      ? Math.round(moodRaw)
      : null
  return {
    gratitude: arr(o.gratitude),
    highlights: arr(o.highlights),
    affirmation: str(o.affirmation),
    tomorrowGreat: arr(o.tomorrowGreat),
    improvement: str(o.improvement),
    mood,
    goodDeed: str(o.goodDeed),
  }
}
