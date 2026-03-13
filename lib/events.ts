import type { VinoraSavedEvent } from '@/types/customer'

export const EVENTS_2026: Omit<VinoraSavedEvent, 'id'>[] = [
  { name: 'Stuttgarter Frühlingsfest',    datum: '2026-04-18', ort: 'Stuttgart',  typ: 'Stadtfest / Volksfest', notiz: 'Traditionelles Volksfest auf dem Cannstatter Wasen', auto: true },
  { name: 'Stuttgarter Weindorf',         datum: '2026-08-26', ort: 'Stuttgart',  typ: 'Weinfest',              notiz: 'Größtes Weinfest Württembergs', auto: true },
  { name: 'Cannstatter Volksfest',        datum: '2026-09-25', ort: 'Stuttgart',  typ: 'Stadtfest / Volksfest', notiz: 'Zweitgrößtes Volksfest Deutschlands', auto: true },
  { name: 'Oktoberfest München',          datum: '2026-09-19', ort: 'München',    typ: 'Stadtfest / Volksfest', notiz: 'Weltgrößtes Volksfest', auto: true },
  { name: 'Wein am Main Frankfurt',       datum: '2026-08-07', ort: 'Frankfurt',  typ: 'Weinfest',              notiz: 'Weinfest am Römerberg', auto: true },
  { name: 'Heidelberger Weinfest',        datum: '2026-06-12', ort: 'Heidelberg', typ: 'Weinfest',              notiz: 'Weinfest am Kornmarkt mit Blick auf das Schloss', auto: true },
  { name: 'Freiburger Weinfest',          datum: '2026-07-03', ort: 'Freiburg',   typ: 'Weinfest',              notiz: 'Weinfest auf dem Rathausplatz', auto: true },
  { name: 'Nürnberger Stadtfest',         datum: '2026-07-10', ort: 'Nürnberg',   typ: 'Stadtfest / Volksfest', notiz: 'Großes Stadtfest in der Altstadt', auto: true },
  { name: 'Hochzeitssaison Frühling',     datum: '2026-05-09', ort: 'alle',       typ: 'Hochzeit-Saison',       notiz: 'Beginn der Hochzeitssaison – Sekt & Weißweine gefragt', auto: true },
  { name: 'Hochzeitssaison Sommer',       datum: '2026-06-20', ort: 'alle',       typ: 'Hochzeit-Saison',       notiz: 'Hauptsaison – Sekt Brut und Rosé top gefragt', auto: true },
  { name: 'Restaurant-Neuöffnungen',      datum: '2026-03-20', ort: 'alle',       typ: 'Restaurant-Eröffnung',  notiz: 'Typische Eröffnungssaison', auto: true },
]

export function locationMatch(evOrt: string, wohnort: string): boolean {
  if (!evOrt || !wohnort) return false
  const a = evOrt.toLowerCase().trim()
  const b = wohnort.toLowerCase().trim()
  if (a === 'alle') return true
  if (a === b) return true
  if (a.split(' ')[0] === b.split(' ')[0]) return true
  const pA = a.replace(/\D/g, '').slice(0, 2)
  const pB = b.replace(/\D/g, '').slice(0, 2)
  if (pA && pB && pA === pB) return true
  return false
}

export function initAutoEvents(
  existing: VinoraSavedEvent[],
  customerRegions: string[]
): VinoraSavedEvent[] {
  const existingNames = new Set(existing.map(e => e.name))
  const toAdd = EVENTS_2026
    .filter(ev => !existingNames.has(ev.name))
    .filter(ev => ev.ort === 'alle' || customerRegions.length === 0 || customerRegions.some(r => locationMatch(ev.ort, r)))
    .map(ev => ({ ...ev, id: 'auto_' + ev.name.replace(/\W+/g, '_') }))
  return [...existing, ...toAdd]
}

export function evTypColor(typ: string): string {
  const m: Record<string, string> = {
    'Hochzeit-Saison': '#e91e8c', 'Restaurant-Eröffnung': '#e67e22',
    'Weinfest': '#6B2737', 'Stadtfest / Volksfest': '#3498db',
    'Firmen-Event': '#2c3e50', 'Sonstiges': '#95a5a6',
  }
  return m[typ] || '#888'
}
