import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/transcribe
 * Body: multipart/form-data mit Feld "audio" (Blob, beliebiges Format).
 * Antwort: { text: string, durationSec?: number }
 *
 * Nutzt OpenAI Whisper (whisper-1) für deutschsprachige Audio-Transkription.
 * Whisper ist im 6-Min-Tagebuch-Kontext die qualitativ beste Wahl: kurze
 * Sprachnotizen <5min, Deutsch, Umgangssprache.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY fehlt. Bitte in .env.local hinterlegen." },
      { status: 500 },
    )
  }

  let inForm: FormData
  try {
    inForm = await req.formData()
  } catch {
    return NextResponse.json({ error: "Audio konnte nicht gelesen werden." }, { status: 400 })
  }

  const audio = inForm.get("audio")
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Kein Audio gefunden." }, { status: 400 })
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio ist größer als 25 MB. Bitte kürzer aufnehmen." },
      { status: 413 },
    )
  }

  // Whisper akzeptiert mp3, mp4, mpeg, mpga, m4a, wav, webm.
  // Wir bekommen typischerweise audio/webm (Browser MediaRecorder).
  const filename =
    (audio as File).name ||
    `recording.${(audio.type.split("/")[1] || "webm").split(";")[0]}`

  const out = new FormData()
  out.append("file", audio, filename)
  out.append("model", "whisper-1")
  out.append("language", "de")
  out.append("response_format", "json")
  out.append("temperature", "0")
  // Whisper-Prompt verbessert Qualität (Domain-Hinweise, Eigennamen).
  out.append(
    "prompt",
    "Tagebuch-Sprachnotiz im 6-Minuten-Tagebuch-Stil: Dankbarkeit, Highlights, Affirmation, Vorsätze, Verbesserung, Stimmung 1 bis 10.",
  )

  let res: Response
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: out,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Verbindung zu OpenAI fehlgeschlagen.", detail: String(err) },
      { status: 502 },
    )
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    return NextResponse.json(
      { error: "Transkription fehlgeschlagen.", detail: errText.slice(0, 500) },
      { status: res.status },
    )
  }

  const data = (await res.json()) as { text?: string }
  const text = (data.text ?? "").trim()
  if (!text) {
    return NextResponse.json({ error: "Leeres Transkript." }, { status: 422 })
  }

  return NextResponse.json({ text })
}
