import type { Customer, RawCsvRow, OrderItem, Segment, ClvTier, RisikoSignal, UpsellingSignal, WineRecommendation, WineProduct } from '@/types/customer'

export interface RfmSettings {
  topKundeMin: number
  loyalMin: number
  clvTierAMin: number
  clvTierBMin: number
  prioGefaehrdet: number
  prioTopKunde: number
  prioEingeschlafen: number
  prioLoyal: number
  prioRest: number
  clvTierABonus: number
  clvTierBBonus: number
  abTestingEnabled: boolean
  // Kaufrhythmus statt fester Tagesgrenze
  fruehwarnFaktor: number   // ab dem Wievielfachen des eigenen Kaufintervalls wird gewarnt
  akutFaktor: number        // ab wann akut
  // Prognose
  prognoseJahre: number     // Horizont für den prädiktiven CLV
  abzinsungProzent: number  // jährliche Abzinsung künftiger Umsätze
}

export const DEFAULT_SETTINGS: RfmSettings = {
  topKundeMin: 12,
  loyalMin: 9,
  clvTierAMin: 3000,
  clvTierBMin: 1000,
  prioGefaehrdet: 100,
  prioTopKunde: 80,
  prioEingeschlafen: 60,
  prioLoyal: 40,
  prioRest: 20,
  clvTierABonus: 30,
  clvTierBBonus: 15,
  abTestingEnabled: true,
  fruehwarnFaktor: 1.5,
  akutFaktor: 2.5,
  prognoseJahre: 5,
  abzinsungProzent: 10,
}

const WINE_MATRIX: Record<string, WineRecommendation[]> = {
  'Riesling':        [{ id: 'W001', name: 'Grauburgunder', reason: 'Ähnliches Terroir, trockener Stil' }, { id: 'W002', name: 'Silvaner', reason: 'Fränkische Alternative' }],
  'Grauburgunder':   [{ id: 'W003', name: 'Riesling', reason: 'Klassischer Begleiter' }, { id: 'W004', name: 'Chardonnay', reason: 'Internationaler Stil' }],
  'Spätburgunder':   [{ id: 'W005', name: 'Lemberger', reason: 'Württemberger Pendant' }, { id: 'W006', name: 'Dornfelder', reason: 'Fruchtiger Rotwein' }],
  'Lemberger':       [{ id: 'W007', name: 'Spätburgunder', reason: 'Elegantere Variante' }, { id: 'W008', name: 'Merlot', reason: 'Internationales Upgrade' }],
  'Gewürztraminer':  [{ id: 'W009', name: 'Muskateller', reason: 'Aromatische Familie' }, { id: 'W010', name: 'Riesling Spätlese', reason: 'Süßerer Stil' }],
  'Muskateller':     [{ id: 'W011', name: 'Gewürztraminer', reason: 'Verwandte Sorte' }, { id: 'W012', name: 'Scheurebe', reason: 'Deutsches Original' }],
  'Sekt Brut':       [{ id: 'W013', name: 'Riesling', reason: 'Stilvolle Alternative' }, { id: 'W014', name: 'Chardonnay', reason: 'Für Hochzeiten ideal' }],
  'Silvaner':        [{ id: 'W015', name: 'Riesling', reason: 'Klassiker nebenan' }, { id: 'W016', name: 'Grauburgunder', reason: 'Bayrische Variante' }],
  'Dornfelder':      [{ id: 'W017', name: 'Lemberger', reason: 'Württemberger Klassiker' }, { id: 'W018', name: 'Spätburgunder', reason: 'Premium Upgrade' }],
}
const DEFAULT_WINES: WineRecommendation[] = [
  { id: 'W019', name: 'Riesling', reason: 'Deutschlands Lieblingssorte' },
  { id: 'W020', name: 'Grauburgunder', reason: 'Vielseitiger Begleiter' },
]

/**
 * Empfehlungen aus dem echten Sortiment.
 * Ohne hochgeladenen Katalog bleibt die Sortenmatrix als Notnagel – mit Katalog
 * werden nur Weine vorgeschlagen, die das Weingut tatsächlich im Keller hat,
 * im passenden Preisband (eine Stufe über dem bisherigen Flaschenpreis).
 */
export function recommendWines(
  lieblingssorte: string,
  gekaufteWeine: Set<string>,
  avgFlaschenpreis: number,
  catalog: WineProduct[],
): WineRecommendation[] {
  if (!catalog || catalog.length === 0) {
    return WINE_MATRIX[lieblingssorte] ?? DEFAULT_WINES
  }

  const verwandte = (WINE_MATRIX[lieblingssorte] ?? DEFAULT_WINES).map(w => w.name.toLowerCase())
  const ziel = avgFlaschenpreis > 0 ? avgFlaschenpreis * 1.2 : 0

  const bewertet = catalog
    .filter(w => !gekaufteWeine.has(w.weinname) && !gekaufteWeine.has(w.sorte))
    .map(w => {
      const sorte = (w.sorte || '').toLowerCase()
      let score = 0
      let grund = ''
      const verwandtIdx = verwandte.findIndex(v => sorte.includes(v) || v.includes(sorte))
      if (verwandtIdx === 0)      { score += 60; grund = `Passt zu ${lieblingssorte} – ähnlicher Stil` }
      else if (verwandtIdx > 0)   { score += 45; grund = `Verwandt mit ${lieblingssorte}` }
      else if (sorte === lieblingssorte.toLowerCase()) { score += 30; grund = `Anderer Wein der Lieblingssorte` }
      else                        { score += 10; grund = 'Neue Sorte zum Entdecken' }

      if (ziel > 0 && w.preis > 0) {
        const abstand = Math.abs(w.preis - ziel) / ziel
        score += Math.max(0, 25 - abstand * 50)
        if (w.preis > avgFlaschenpreis * 1.1 && w.preis <= avgFlaschenpreis * 1.6) {
          score += 10
          grund += ` · ${fmt(w.preis)} – eine Stufe über dem gewohnten Preis`
        }
      }
      return { w, score, grund }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (bewertet.length === 0) return WINE_MATRIX[lieblingssorte] ?? DEFAULT_WINES
  return bewertet.map(({ w, grund }) => ({
    id: w.id,
    name: w.jahrgang ? `${w.weinname} ${w.jahrgang}` : w.weinname,
    reason: grund,
  }))
}

function parseDate(str: string): Date | null {
  if (!str) return null
  str = str.trim()
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
    const [d, m, y] = str.split('.')
    return new Date(+y, +m - 1, +d)
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function maxKey(obj: Record<string, number>): string | null {
  let max = -1; let key: string | null = null
  for (const [k, v] of Object.entries(obj)) { if (v > max) { max = v; key = k } }
  return key
}

function getSaison(monthStr: string | null): string {
  const m = parseInt(monthStr || '0')
  if ([3, 4, 5].includes(m)) return 'Frühling'
  if ([6, 7, 8].includes(m)) return 'Sommer'
  if ([9, 10, 11].includes(m)) return 'Herbst'
  return 'Winter'
}

function quintile(value: number, allValues: number[], invertForLow: boolean): number {
  const sorted = [...allValues].sort((a, b) => a - b)
  const n = sorted.length
  const idx = sorted.findIndex(v => v >= value)
  const pct = idx < 0 ? 1 : idx / n
  const s = pct < 0.2 ? 1 : pct < 0.4 ? 2 : pct < 0.6 ? 3 : pct < 0.8 ? 4 : 5
  return invertForLow ? (6 - s) : s
}

export function getAbGroup(id: string): 'A' | 'B' {
  let h = 0
  for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0 }
  return Math.abs(h) % 2 === 0 ? 'A' : 'B'
}

/**
 * Median-Abstand zwischen zwei Bestellungen – der eigene Rhythmus des Kunden.
 * Median statt Mittelwert, damit eine einzelne Großbestellung den Takt nicht verzerrt.
 */
export function medianIntervalDays(orders: OrderItem[]): number | null {
  const dates = orders.map(o => o.date).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())
  if (dates.length < 2) return null
  const gaps: number[] = []
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / 86400000)
  }
  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  const median = gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid]
  return Math.max(median, 1)
}

/**
 * Abwanderungsrisiko aus dem eigenen Rhythmus.
 * Ein Kunde, der immer im Dezember eine Kiste holt, ist nach 400 Tagen nicht auffällig –
 * einer, der sonst monatlich bestellt, nach 120 Tagen sehr wohl. Genau das bildet der
 * Überfälligkeitsfaktor ab: recencyDays geteilt durch das eigene Kaufintervall.
 */
export function churnRisiko(ueberfaelligFaktor: number, intervall: number | null, recencyDays: number): number {
  if (intervall === null) {
    // Einmalkäufer: kein Rhythmus bekannt, also nur die schlichte Zeitachse
    return Math.min(0.9, recencyDays / 730)
  }
  // Flache Kurve mit Deckel: auch ein lange stiller Kunde ist nicht sicher verloren –
  // Weinkunden kommen nach einer Pause erfahrungsgemäß zurück.
  const ueberzug = Math.max(0, ueberfaelligFaktor - 1)
  return Math.min(0.85, 1 - Math.exp(-0.45 * ueberzug))
}

/**
 * Prädiktiver CLV: erwarteter Jahresumsatz × Überlebenswahrscheinlichkeit, abgezinst.
 * Der historische `clv` (Umsatz/Jahr × 5) gibt einem Kunden mit einer Großbestellung vor
 * zwei Jahren denselben Wert wie einem aktiven Stammkunden – hier fällt er korrekt ab.
 */
export function prognoseClv(
  jahresumsatz: number, churn: number, jahre: number, abzinsungProzent: number,
): number {
  const p = Math.max(0, 1 - churn)
  const d = 1 + abzinsungProzent / 100
  let sum = 0
  for (let t = 1; t <= jahre; t++) {
    sum += (jahresumsatz * Math.pow(p, t)) / Math.pow(d, t)
  }
  return sum
}

function calcRisikoSignal(
  c: { segment: Segment; rScore: number; ueberfaelligFaktor: number; kaufintervallTage: number | null; recencyDays: number },
  settings: RfmSettings,
): RisikoSignal {
  if (c.kaufintervallTage === null) {
    // Einmalkäufer haben keinen Rhythmus – hier bleibt die Zeitachse das einzige Signal
    if (c.recencyDays > 540) return 'Akut gefährdet'
    if (c.recencyDays > 270) return 'Frühwarnung'
    return 'Keins'
  }
  if (c.ueberfaelligFaktor >= settings.akutFaktor) return 'Akut gefährdet'
  if (c.ueberfaelligFaktor >= settings.fruehwarnFaktor) return 'Frühwarnung'
  return 'Keins'
}

function calcUpsellingSignal(orders: OrderItem[], lebensdauerTage: number): UpsellingSignal {
  if (orders.length < 2) return 'Keins'
  const recent90 = orders.filter(o => o.date && (Date.now() - o.date.getTime()) < 90 * 86400000).length
  // Vergleichsmaßstab ist die Kundenlebensdauer, nicht der Abstand zum letzten Kauf
  const avgPer90 = (orders.length / Math.max(lebensdauerTage, 90)) * 90
  if (recent90 > avgPer90 * 1.5 && recent90 >= 2) return 'Frequenz gestiegen'
  if (orders.length >= 4) {
    const lastAvg = (orders[0].revenue + orders[1].revenue) / 2
    const firstAvg = (orders[orders.length - 2].revenue + orders[orders.length - 1].revenue) / 2
    if (lastAvg > firstAvg * 1.25) return 'Preis-Upgrade'
  }
  if (orders.length >= 3) {
    const previousWines = new Set(orders.slice(2).map(o => o.weinBase))
    const recentWines = orders.slice(0, 2).map(o => o.weinBase)
    if (recentWines.some(w => w && !previousWines.has(w))) return 'Neue Sorte'
  }
  return 'Keins'
}

export function getMassnahmenTyp(segment: Segment, clvTier: ClvTier, kundenjahre: number): string {
  if (segment === 'Top-Kunde')       return clvTier === 'A' ? 'Persönliche Einladung' : clvTier === 'B' ? 'VIP-Angebot' : 'Treue-Anerkennung'
  if (segment === 'Loyal')           return (clvTier === 'A' || clvTier === 'B') ? 'Cross-Sell Empfehlung' : 'Newsletter + Rabatt'
  if (segment === 'Gefährdet')       return (clvTier === 'A' || clvTier === 'B') ? 'Sofort: Persönlicher Anruf' : 'Reaktivierung mit Probe'
  if (segment === 'Eingeschlafen')   return clvTier === 'A' && kundenjahre < 2 ? 'Persönliche Reaktivierung' : 'Reaktivierung mit Rabatt'
  if (segment === 'Neukunde/Selten') return 'Kundenbindung aufbauen'
  return 'Förderung + Weinprobe'
}

export function runSegmentation(
  rows: RawCsvRow[],
  settings: RfmSettings = DEFAULT_SETTINGS,
  catalog: WineProduct[] = [],
): Customer[] {
  const today = new Date()
  const map: Record<string, {
    id: string; vorname: string; nachname: string; email: string; wohnort: string
    orders: OrderItem[]; totalRevenue: number
    weinsorten: Record<string, number>; kanaele: Record<string, number>; monate: Record<string, number>
    firstOrder: Date | null; lastOrder: Date | null
  }> = {}

  for (const row of rows) {
    const id = (row['Customer ID'] || '').trim()
    if (!id) continue
    const date = parseDate(row['Kaufdatum'])
    const revenue = parseFloat((row['Gesamtpreis_EUR'] || '0').replace(',', '.')) || 0
    const weinRaw = (row['Wein'] || '').trim()
    const weinBase = weinRaw.replace(/\s\d{4}$/, '').trim()
    const kanal = (row['Weg_der_Bestellung'] || '').trim()
    const flaschen = parseInt(row['Anzahl_Flaschen'] || '1') || 1
    const month = date ? String(date.getMonth() + 1) : null

    if (!map[id]) {
      map[id] = {
        id, vorname: (row['Vorname'] || '').trim(), nachname: (row['Nachname'] || '').trim(),
        email: (row['Email'] || '').trim(), wohnort: (row['Wohnort'] || '').trim(),
        orders: [], totalRevenue: 0, weinsorten: {}, kanaele: {}, monate: {},
        firstOrder: null, lastOrder: null,
      }
    }
    const c = map[id]
    c.totalRevenue += revenue
    c.orders.push({ date, weinRaw, weinBase, revenue, kanal, flaschen })
    if (date) {
      if (!c.firstOrder || date < c.firstOrder) c.firstOrder = date
      if (!c.lastOrder || date > c.lastOrder) c.lastOrder = date
    }
    if (weinBase) c.weinsorten[weinBase] = (c.weinsorten[weinBase] || 0) + 1
    if (kanal) c.kanaele[kanal] = (c.kanaele[kanal] || 0) + 1
    if (month) c.monate[month] = (c.monate[month] || 0) + 1
  }

  const partial = Object.values(map).map(c => {
    c.orders.sort((a, b) => ((b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)))
    return {
      ...c,
      recencyDays: c.lastOrder ? Math.floor((today.getTime() - c.lastOrder.getTime()) / 86400000) : 9999,
      orderCount: c.orders.length,
      lieblingssorte: maxKey(c.weinsorten) || 'Unbekannt',
      bevKanal: maxKey(c.kanaele) || 'Unbekannt',
      kaufsaison: getSaison(maxKey(c.monate)),
      durchschnBestellwert: c.orders.length > 0 ? c.totalRevenue / c.orders.length : 0,
    }
  })

  const R = partial.map(c => c.recencyDays)
  const F = partial.map(c => c.orderCount)
  const M = partial.map(c => c.totalRevenue)

  const withRfm = partial.map(c => ({
    ...c,
    rScore: quintile(c.recencyDays, R, true),
    fScore: quintile(c.orderCount, F, false),
    mScore: quintile(c.totalRevenue, M, false),
  }))

  return withRfm.map(c => {
    const rfmTotal = c.rScore + c.fScore + c.mScore
    const days = (c.firstOrder && c.lastOrder) ? (c.lastOrder.getTime() - c.firstOrder.getTime()) / 86400000 : 0
    const kundenjahre = Math.max(days / 365, 0.5)
    const clv = (c.totalRevenue / kundenjahre) * 5

    // Eigener Kaufrhythmus
    const kaufintervallTage = medianIntervalDays(c.orders)
    const ueberfaelligFaktor = kaufintervallTage ? c.recencyDays / kaufintervallTage : 0
    const naechsterKaufErwartet = (kaufintervallTage && c.lastOrder)
      ? new Date(c.lastOrder.getTime() + kaufintervallTage * 86400000)
      : null
    const churn = churnRisiko(ueberfaelligFaktor, kaufintervallTage, c.recencyDays)

    // Erwarteter Jahresumsatz: bei bekanntem Rhythmus aus Bestellwert × Frequenz,
    // sonst aus dem bisherigen Durchschnitt
    const jahresumsatz = kaufintervallTage
      ? c.durchschnBestellwert * (365 / kaufintervallTage)
      : c.totalRevenue / kundenjahre
    const clvPrognose = prognoseClv(jahresumsatz, churn, settings.prognoseJahre, settings.abzinsungProzent)

    const clvTier: ClvTier = clvPrognose > settings.clvTierAMin ? 'A' : clvPrognose > settings.clvTierBMin ? 'B' : 'C'

    let segment: Segment
    if      (rfmTotal >= settings.topKundeMin)           segment = 'Top-Kunde'
    else if (rfmTotal >= settings.loyalMin)              segment = 'Loyal'
    else if (c.rScore <= 2 && c.fScore >= 3)             segment = 'Gefährdet'
    else if (c.rScore <= 2)                              segment = 'Eingeschlafen'
    else if (c.fScore <= 2)                              segment = 'Neukunde/Selten'
    else                                                 segment = 'Wachsend'

    const segBase: Record<string, number> = {
      'Gefährdet': settings.prioGefaehrdet, 'Top-Kunde': settings.prioTopKunde,
      'Eingeschlafen': settings.prioEingeschlafen, 'Loyal': settings.prioLoyal,
    }
    const prioBase = segBase[segment] ?? settings.prioRest
    const prioScore = prioBase + (clvTier === 'A' ? settings.clvTierABonus : clvTier === 'B' ? settings.clvTierBBonus : 0)

    const lebensdauerTage = c.firstOrder ? (today.getTime() - c.firstOrder.getTime()) / 86400000 : 0
    const risikoSignal = calcRisikoSignal(
      { segment, rScore: c.rScore, ueberfaelligFaktor, kaufintervallTage, recencyDays: c.recencyDays },
      settings,
    )
    const upsellingSignal = calcUpsellingSignal(c.orders, lebensdauerTage)
    const flaschenGesamt = c.orders.reduce((sum, o) => sum + (o.flaschen || 0), 0)
    const avgFlaschenpreis = flaschenGesamt > 0 ? c.totalRevenue / flaschenGesamt : 0
    const gekaufteWeine = new Set(c.orders.flatMap(o => [o.weinBase, o.weinRaw]).filter(Boolean))
    const empfohleneWeine = recommendWines(c.lieblingssorte, gekaufteWeine, avgFlaschenpreis, catalog)
    const massnahmenTyp = getMassnahmenTyp(segment, clvTier, kundenjahre)
    const abGroup = getAbGroup(c.id)

    return {
      id: c.id, vorname: c.vorname, nachname: c.nachname, email: c.email, wohnort: c.wohnort,
      orders: c.orders, totalRevenue: c.totalRevenue, orderCount: c.orderCount,
      firstOrder: c.firstOrder, lastOrder: c.lastOrder, recencyDays: c.recencyDays,
      lieblingssorte: c.lieblingssorte, bevKanal: c.bevKanal, kaufsaison: c.kaufsaison,
      durchschnBestellwert: c.durchschnBestellwert,
      rScore: c.rScore, fScore: c.fScore, mScore: c.mScore, rfmTotal,
      kaufintervallTage, ueberfaelligFaktor, naechsterKaufErwartet, churnRisiko: churn,
      kundenjahre, clv, clvPrognose, clvTier, segment, prioScore,
      risikoSignal, upsellingSignal, empfohleneWeine,
      massnahmenTyp, abGroup,
    } satisfies Customer
  })
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '–'
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const SEGMENT_COLORS: Record<string, string> = {
  'Top-Kunde': '#FFD700', 'Loyal': '#C6EFCE', 'Gefährdet': '#FFEB9C',
  'Eingeschlafen': '#FFC7CE', 'Neukunde/Selten': '#DDEBF7', 'Wachsend': '#E2EFDA',
}

export const SEGMENT_TEXT_COLORS: Record<string, string> = {
  'Top-Kunde': '#5a4000', 'Loyal': '#1e5e2e', 'Gefährdet': '#7a5800',
  'Eingeschlafen': '#8b0000', 'Neukunde/Selten': '#1a4a7a', 'Wachsend': '#2a5a1a',
}
