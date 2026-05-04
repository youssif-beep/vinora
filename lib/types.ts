/**
 * Eintrags-Datenmodell.
 * Eine Sprachnachricht wird transkribiert (Whisper) und von Claude in
 * die Felder des 6-Minuten-Tagebuchs zerlegt. Der User kann jedes Feld
 * nachträglich editieren.
 */
export type DiaryEntry = {
  /** stable id (uuid v4) */
  id: string
  /** local date YYYY-MM-DD (Tag des Eintrags, nicht UTC) */
  date: string
  createdAt: string
  updatedAt: string

  /** Roh-Transkript (Whisper) */
  transcript: string
  /** Aufnahme-Dauer in Sekunden (optional, falls bekannt) */
  durationSec?: number

  /** 6-Minuten-Tagebuch: die sechs Felder */
  gratitude: string[]        // Wofür ich dankbar bin (max 3)
  highlights: string[]       // Schöne Momente / Erfolge heute (max 3)
  affirmation: string        // Tagesaffirmation / "Ich bin..."
  tomorrowGreat: string[]    // Was den nächsten Tag großartig macht (max 3)
  improvement: string        // Was ich besser machen würde / Lernfeld
  mood: number | null        // 1–10 Stimmung
  goodDeed?: string          // Optionale Zusatznotiz

  /** internal */
  source: "voice" | "text" | "manual"
}

export type EntryDraft = Omit<DiaryEntry, "id" | "createdAt" | "updatedAt">

export type StructuredFields = Pick<
  DiaryEntry,
  "gratitude" | "highlights" | "affirmation" | "tomorrowGreat" | "improvement" | "mood" | "goodDeed"
>

export type Settings = {
  /** Datum, an dem Onboarding abgeschlossen wurde (ISO) */
  onboardedAt?: string
  /** Letzter Reflexions-Prompt-Modus */
  reminderHour?: number
  theme?: "system" | "light" | "dark"
}
