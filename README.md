# Heute.

> Eine Sprachnachricht. Sechs Felder. Dein Tag, in deinen eigenen Worten.

**Heute.** ist ein digitales Tagebuch im Stil des _6-Minuten-Tagebuchs_, mit einer einzigen Anforderung: **Du sprichst, der Rest passiert von selbst.**

Du drückst auf den Aufnahme-Knopf, sprichst frei über deinen Tag, und die App strukturiert die Sprachnachricht automatisch in die sechs Tagebuchfelder. Du reviewst, editierst, speicherst. Streak und Reflexion über die Woche kommen dazu.

---

## Wie es funktioniert

```
  Sprachnachricht  ──►  Whisper  ──►  Transkript  ──►  Claude  ──►  6 Felder
       (Browser)      (OpenAI)        (Deutsch)        (Anthropic)    (lokal gespeichert)
```

1. **Aufnehmen.** Browser-Mikrofon, MediaRecorder, Live-Waveform, Pause/Resume.
2. **Transkribieren.** OpenAI Whisper (`whisper-1`, Sprache: Deutsch).
3. **Strukturieren.** Claude Opus 4.7 extrahiert die sechs Felder als JSON — strikt aus dem Transkript, ohne zu erfinden.
4. **Speichern.** Alles bleibt lokal in deinem Browser (LocalStorage). Kein Account, keine Cloud-Datenbank.
5. **Editieren.** Jedes Feld ist inline editierbar — Klick rein, tippen, raus.

## Die sechs Felder

| Feld                   | Was hineingehört                                  |
| ---------------------- | ------------------------------------------------- |
| **Dankbarkeit**        | 3 Dinge, für die du heute dankbar bist            |
| **Highlights**         | 3 großartige Momente des Tages                    |
| **Affirmation**        | Dein Ich-bin-Satz für morgen                      |
| **Morgen großartig**   | 3 Dinge, die morgen großartig machen würden       |
| **Verbesserung**       | Was hätte den Tag besser gemacht                  |
| **Stimmung**           | Skala 1 – 10                                      |

Plus optional: **Gute Tat** des Tages.

## Features

- 🎙 **Voice-First.** Aufnehmen, pausieren, fortsetzen, neu starten — Live-Pegelanzeige.
- ✍️ **Text-Fallback.** Kein Mikrofon? Schreib stattdessen.
- 🧠 **AI-Strukturierung.** Claude extrahiert die Felder — übernimmt Original-Formulierungen, erfindet nichts.
- ✏️ **Inline-Edit.** Jedes Feld direkt nachbearbeitbar.
- 🔥 **Streak.** Aktuelle und längste Streak, Gesamtanzahl.
- 📖 **Verlauf.** Alle Einträge, suchbar, gruppiert nach Monat.
- 📊 **Reflexion.** Claude schreibt dir wöchentlich eine Zusammenfassung mit Mustern und einer Einladung für die nächste Woche.
- 📈 **Stimmungsverlauf.** Sparkline der letzten Tage.
- 💾 **Export/Import.** Vollständiger JSON-Export, Re-Import auf jedem Gerät.
- 🔒 **Privacy-First.** Keine Cloud-Speicherung. Audio wird nur kurzzeitig zur Transkription übertragen.
- 🌗 **Light & Dark.** Warmes Papier-Tagebuch-Design.

## Setup

```bash
npm install
cp .env.local.example .env.local   # API-Keys eintragen
npm run dev
```

Du brauchst:

| Variable             | Wofür                                | Anlegen unter                                     |
| -------------------- | ------------------------------------ | ------------------------------------------------- |
| `OPENAI_API_KEY`     | Whisper-Transkription                | https://platform.openai.com/api-keys              |
| `ANTHROPIC_API_KEY`  | Claude-Strukturierung & -Reflexion   | https://console.anthropic.com/settings/keys       |

Dann öffne [http://localhost:3000](http://localhost:3000), erlaube Mikrofon-Zugriff, und sprich.

## Architektur

```
app/
  page.tsx            Heute — Aufnahme oder heutiger Eintrag
  history/page.tsx    Verlauf aller Einträge mit Suche
  entry/[date]/       Einzeltag-Detail mit Edit + Löschen
  insights/page.tsx   Wochenreflexion + Stimmungsverlauf
  settings/page.tsx   Export, Import, Privacy
  api/
    transcribe/       Whisper → Text
    structure/        Claude → 6 Felder
    insights/         Claude → Wochenreflexion

components/
  recorder.tsx        MediaRecorder + Waveform + Cue-Cards
  cue-cards.tsx       Animierte Anleitungskarten
  diary-card.tsx      6 Felder als editierbare Karten
  editable.tsx        Inline-Edit Primitives
  header.tsx, streak-badge.tsx, transcript-toggle.tsx

lib/
  types.ts            DiaryEntry, StructuredFields
  storage.ts          LocalStorage + useSyncExternalStore-Hooks
  date.ts             Datums-Utils (lokale Zeitzone)
  streak.ts           Streak-Berechnung, Mood-Average
  prompts.ts          Claude-System-Prompts
```

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript 5**
- **Tailwind v4** + benutzerdefiniertes Papier-Design-System
- **Anthropic SDK** (`@anthropic-ai/sdk`) für Claude
- **OpenAI Whisper** via fetch
- **framer-motion** für Übergänge
- **Sonner** für Toasts
- **Lucide** für Icons

## Privacy

- Einträge werden ausschließlich in deinem Browser-LocalStorage gespeichert.
- Audio geht zur Transkription an OpenAI, das Transkript zur Strukturierung an Anthropic.
- Beide Anbieter speichern API-Inhalte standardmäßig **nicht** für Training.
- Du kannst alle Daten als JSON exportieren und auf einem anderen Gerät importieren.
- Mit einem Klick alles löschen.
