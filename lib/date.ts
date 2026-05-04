/** Datums-Utilities mit lokaler Zeitzone (kein UTC-Versatz). */

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

export function formatLong(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
}

export function formatRelative(d: Date, now: Date = new Date()): string {
  const today = todayKey(now)
  const yest = todayKey(addDays(now, -1))
  const k = todayKey(d)
  if (k === today) return "Heute"
  if (k === yest) return "Gestern"
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays < 7) return `vor ${diffDays} Tagen`
  return formatShort(d)
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return "Gute Nacht"
  if (h < 11) return "Guten Morgen"
  if (h < 14) return "Hallo"
  if (h < 18) return "Guten Tag"
  if (h < 22) return "Guten Abend"
  return "Gute Nacht"
}

/** Wie viele Sekunden seit Mitternacht heute? */
export function secondsToday(d: Date = new Date()): number {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

/** Liste der letzten N Tage als Keys, neuester zuerst. */
export function lastNDays(n: number, now: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => todayKey(addDays(now, -i)))
}
