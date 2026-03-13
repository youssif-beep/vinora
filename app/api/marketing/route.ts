import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key') {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY fehlt in .env.local — KI nicht verfügbar' }, { status: 503 })
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { segment, clvTier, lieblingssorte, recencyDays, orderCount, totalRevenue, massnahmenTyp } = await req.json()

    const prompt = `Du bist ein Experte für Weingut-Marketing. Erstelle eine konkrete, personalisierte Marketingstrategie für folgenden Kunden:

Segment: ${segment}
CLV Tier: ${clvTier}
Lieblingssorte: ${lieblingssorte}
Letzter Kauf: vor ${recencyDays} Tagen
Anzahl Bestellungen: ${orderCount}
Gesamtumsatz: ${totalRevenue}€
Empfohlene Maßnahme: ${massnahmenTyp}

Antworte auf Deutsch mit:
1. **Kurzbewertung** (2 Sätze): Warum ist dieser Kunde in diesem Segment?
2. **KI-Empfehlung** (3-4 Sätze): Was genau tun? Wann? Wie?
3. **Gesprächseinstieg** (1 konkreter Satz zum Einstieg beim Anruf/Email)
4. **Wein-Tipp** (1 Satz): Welcher Wein passt aktuell zu diesem Kunden?

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
