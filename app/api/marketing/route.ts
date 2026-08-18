import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

/**
 * Vinora läuft lokal – es gibt keine Nutzerkonten, gegen die geprüft werden könnte.
 * Zwei einfache Riegel verhindern trotzdem, dass die Route von außen Tokens verbrennt:
 * sie nimmt nur Anfragen von der eigenen Oberfläche an und begrenzt die Frequenz.
 */
const RATE_LIMIT = 30          // Anfragen
const RATE_FENSTER_MS = 60_000 // pro Minute
const treffer = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const jetzt = Date.now()
  const bisher = (treffer.get(key) ?? []).filter(t => jetzt - t < RATE_FENSTER_MS)
  bisher.push(jetzt)
  treffer.set(key, bisher)
  return bisher.length > RATE_LIMIT
}

function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return false
  const origin = req.headers.get('origin')
  if (!origin) return true // direkte Aufrufe ohne Origin (z. B. curl im Test) bleiben erlaubt
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Nur aus der Vinora-Oberfläche aufrufbar' }, { status: 403 })
    }
    const key = req.headers.get('x-forwarded-for') ?? 'lokal'
    if (rateLimited(key)) {
      return NextResponse.json({ error: 'Zu viele Anfragen – kurz warten' }, { status: 429 })
    }
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key') {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY fehlt in .env.local — KI nicht verfügbar' }, { status: 503 })
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const {
      segment, clvTier, lieblingssorte, recencyDays, orderCount, totalRevenue, massnahmenTyp,
      kaufintervallTage, churnRisiko, clvPrognose, empfohleneWeine,
    } = await req.json()

    const rhythmus = kaufintervallTage
      ? `Kauft üblicherweise alle ${Math.round(kaufintervallTage)} Tage (aktuell ${recencyDays} Tage her)`
      : `Letzter Kauf vor ${recencyDays} Tagen, kein regelmäßiger Rhythmus erkennbar`
    const weine = Array.isArray(empfohleneWeine) && empfohleneWeine.length > 0
      ? empfohleneWeine.map((w: { name: string }) => w.name).join(', ')
      : 'kein Katalog hinterlegt'

    const prompt = `Du bist ein Experte für Weingut-Marketing. Erstelle eine konkrete, personalisierte Marketingstrategie für folgenden Kunden:

Segment: ${segment}
CLV Tier: ${clvTier}
Lieblingssorte: ${lieblingssorte}
Kaufrhythmus: ${rhythmus}
Abwanderungsrisiko: ${churnRisiko !== undefined ? Math.round(churnRisiko * 100) + ' %' : 'unbekannt'}
Anzahl Bestellungen: ${orderCount}
Gesamtumsatz bisher: ${totalRevenue}€
Prognostizierter Kundenwert: ${clvPrognose !== undefined ? Math.round(clvPrognose) + '€' : 'unbekannt'}
Weine aus dem eigenen Sortiment, die passen: ${weine}
Empfohlene Maßnahme: ${massnahmenTyp}

Antworte auf Deutsch mit:
1. **Kurzbewertung** (2 Sätze): Warum ist dieser Kunde in diesem Segment?
2. **KI-Empfehlung** (3-4 Sätze): Was genau tun? Wann? Wie?
3. **Gesprächseinstieg** (1 konkreter Satz zum Einstieg beim Anruf/Email)
4. **Wein-Tipp** (1 Satz): Welcher Wein aus dem genannten Sortiment passt und warum?

Kurz, direkt, praxisnah.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ recommendation: text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'KI nicht erreichbar' }, { status: 500 })
  }
}
