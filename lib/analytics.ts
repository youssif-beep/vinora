/**
 * Auswertung: A/B-Bilanz, Wirkung der Maßnahmen, Reaktivierungen.
 *
 * Alle Zahlen stammen aus tatsächlich erfassten Rückmeldungen und aus Bestellungen,
 * die nach dem Versand eingegangen sind – nichts ist geschätzt oder hinterlegt.
 */

import type { Customer, MarketingAction, AbGroup } from '@/types/customer'

/** Zeitfenster, in dem eine Bestellung noch der Maßnahme zugerechnet wird. */
export const ATTRIBUTION_TAGE = 90

export interface VariantStats {
  gruppe: AbGroup
  gesendet: number
  positiv: number
  negativ: number
  keineReaktion: number
  ausstehend: number
  bewertet: number       // alles außer ausstehend – nur das zählt für die Quote
  quote: number          // positiv / bewertet
  umsatz: number         // zugerechneter Umsatz im Attributionsfenster
}

export interface AbAuswertung {
  a: VariantStats
  b: VariantStats
  differenzPunkte: number      // Prozentpunkte Unterschied in der Erfolgsquote
  signifikant: boolean
  pWert: number | null
  gewinner: AbGroup | null
  hinweis: string
}

export interface MassnahmenWirkung {
  massnahmenTyp: string
  gesendet: number
  bewertet: number
  positiv: number
  quote: number
  umsatz: number
  umsatzProMassnahme: number
}

export interface Reaktivierung {
  customerId: string
  customerName: string
  massnahmenTyp: string
  sentAt: string
  ersteBestellungNach: string
  tageBisKauf: number
  umsatz: number
}

// ------------------------------------------------------------ Zurechnung

function ordersAfter(c: Customer | undefined, sentAt: string, fensterTage = ATTRIBUTION_TAGE) {
  if (!c) return []
  const sent = new Date(sentAt).getTime()
  const bis = sent + fensterTage * 86400000
  return c.orders.filter(o => {
    if (!o.date) return false
    const t = o.date instanceof Date ? o.date.getTime() : new Date(o.date).getTime()
    return t >= sent && t <= bis
  })
}

/** Umsatz, der einer einzelnen Maßnahme zugerechnet wird. */
export function umsatzNachMassnahme(action: MarketingAction, customers: Customer[]): number {
  const c = customers.find(x => x.id === action.customerId)
  return ordersAfter(c, action.sentAt).reduce((sum, o) => sum + o.revenue, 0)
}

// ---------------------------------------------------------------- A/B-Test

function leereVariante(gruppe: AbGroup): VariantStats {
  return { gruppe, gesendet: 0, positiv: 0, negativ: 0, keineReaktion: 0, ausstehend: 0, bewertet: 0, quote: 0, umsatz: 0 }
}

/**
 * Zweiseitiger Test auf Unterschied zweier Anteile (Normalapproximation).
 * Gibt den p-Wert zurück; unter 0.05 gilt der Unterschied als belastbar.
 */
export function zTestAnteile(x1: number, n1: number, x2: number, n2: number): number | null {
  if (n1 < 1 || n2 < 1) return null
  const p1 = x1 / n1
  const p2 = x2 / n2
  const pPool = (x1 + x2) / (n1 + n2)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2))
  if (se === 0) return null
  const z = Math.abs(p1 - p2) / se
  // 2 × (1 − Φ(z)) über eine Näherung der Fehlerfunktion
  const t = 1 / (1 + 0.2316419 * z)
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const phi = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return Math.min(1, 2 * phi)
}

export function abAuswertung(actions: MarketingAction[], customers: Customer[]): AbAuswertung {
  const stats: Record<AbGroup, VariantStats> = { A: leereVariante('A'), B: leereVariante('B') }
  const byId = new Map(customers.map(c => [c.id, c]))

  for (const a of actions) {
    // Ältere Maßnahmen tragen die Gruppe nicht mit – dann aus dem Kunden nachschlagen
    const gruppe: AbGroup = a.abGroup ?? byId.get(a.customerId)?.abGroup ?? 'A'
    const s = stats[gruppe]
    s.gesendet++
    if (a.outcome === 'ausstehend') s.ausstehend++
    else {
      s.bewertet++
      if (a.outcome === 'positiv') s.positiv++
      else if (a.outcome === 'negativ') s.negativ++
      else s.keineReaktion++
    }
    s.umsatz += umsatzNachMassnahme(a, customers)
  }

  for (const g of ['A', 'B'] as AbGroup[]) {
    const s = stats[g]
    s.quote = s.bewertet > 0 ? s.positiv / s.bewertet : 0
  }

  const { A: a, B: b } = stats
  const pWert = zTestAnteile(a.positiv, a.bewertet, b.positiv, b.bewertet)
  const signifikant = pWert !== null && pWert < 0.05
  const differenzPunkte = (b.quote - a.quote) * 100

  let gewinner: AbGroup | null = null
  let hinweis: string
  if (a.bewertet + b.bewertet === 0) {
    hinweis = 'Noch keine Rückmeldung erfasst – Ergebnisse im Feedback-Loop eintragen.'
  } else if (a.bewertet < 10 || b.bewertet < 10) {
    hinweis = `Zu wenig Daten für eine belastbare Aussage (A: ${a.bewertet}, B: ${b.bewertet} bewertet). Ab je 10 Rückmeldungen wird gerechnet.`
  } else if (signifikant) {
    gewinner = b.quote > a.quote ? 'B' : 'A'
    hinweis = `Variante ${gewinner} liegt belastbar vorn (p = ${pWert!.toFixed(3)}).`
  } else {
    hinweis = `Kein belastbarer Unterschied (p = ${pWert !== null ? pWert.toFixed(3) : '–'}). Weiter beobachten.`
  }

  return { a, b, differenzPunkte, signifikant, pWert, gewinner, hinweis }
}

// ------------------------------------------------------------ Wirkung

export function massnahmenWirkung(actions: MarketingAction[], customers: Customer[]): MassnahmenWirkung[] {
  const map = new Map<string, MassnahmenWirkung>()
  for (const a of actions) {
    const e = map.get(a.massnahmenTyp) ?? {
      massnahmenTyp: a.massnahmenTyp, gesendet: 0, bewertet: 0, positiv: 0, quote: 0, umsatz: 0, umsatzProMassnahme: 0,
    }
    e.gesendet++
    if (a.outcome !== 'ausstehend') {
      e.bewertet++
      if (a.outcome === 'positiv') e.positiv++
    }
    e.umsatz += umsatzNachMassnahme(a, customers)
    map.set(a.massnahmenTyp, e)
  }
  return [...map.values()]
    .map(e => ({
      ...e,
      quote: e.bewertet > 0 ? e.positiv / e.bewertet : 0,
      umsatzProMassnahme: e.gesendet > 0 ? e.umsatz / e.gesendet : 0,
    }))
    .sort((x, y) => y.umsatz - x.umsatz)
}

/** Kunden, die nach einer Maßnahme wieder bestellt haben. */
export function reaktivierungen(actions: MarketingAction[], customers: Customer[]): Reaktivierung[] {
  const byId = new Map(customers.map(c => [c.id, c]))
  const out: Reaktivierung[] = []
  for (const a of actions) {
    const c = byId.get(a.customerId)
    const nach = ordersAfter(c, a.sentAt)
    if (nach.length === 0) continue
    const sorted = [...nach].sort((x, y) => (x.date?.getTime() ?? 0) - (y.date?.getTime() ?? 0))
    const erste = sorted[0]
    const sent = new Date(a.sentAt).getTime()
    out.push({
      customerId: a.customerId,
      customerName: a.customerName,
      massnahmenTyp: a.massnahmenTyp,
      sentAt: a.sentAt,
      ersteBestellungNach: erste.date ? erste.date.toISOString() : '',
      tageBisKauf: erste.date ? Math.round((erste.date.getTime() - sent) / 86400000) : 0,
      umsatz: nach.reduce((s, o) => s + o.revenue, 0),
    })
  }
  return out.sort((x, y) => y.umsatz - x.umsatz)
}

/** Umsatz, der bei Nichtstun auf dem Spiel steht: Abwanderungsrisiko × prognostizierter Wert. */
export function gefaehrdeterUmsatz(c: Customer): number {
  return (c.churnRisiko ?? 0) * (c.clvPrognose ?? 0)
}

export interface WirkungGesamt {
  gesendet: number
  bewertet: number
  positiv: number
  quote: number
  umsatz: number
  reaktivierteKunden: number
  offen: number
}

export function wirkungGesamt(actions: MarketingAction[], customers: Customer[]): WirkungGesamt {
  const bewertet = actions.filter(a => a.outcome !== 'ausstehend')
  const positiv = actions.filter(a => a.outcome === 'positiv')
  const reakt = reaktivierungen(actions, customers)
  return {
    gesendet: actions.length,
    bewertet: bewertet.length,
    positiv: positiv.length,
    quote: bewertet.length > 0 ? positiv.length / bewertet.length : 0,
    umsatz: reakt.reduce((s, r) => s + r.umsatz, 0),
    reaktivierteKunden: new Set(reakt.map(r => r.customerId)).size,
    offen: actions.filter(a => a.outcome === 'ausstehend').length,
  }
}
