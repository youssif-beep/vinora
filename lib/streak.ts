import type { DiaryEntry } from "./types"
import { addDays, todayKey } from "./date"

/**
 * Berechnet die aktuelle Streak (zusammenhängende Tage mit Eintrag).
 * Heute zählt mit, wenn ein Eintrag existiert. Wenn heute kein Eintrag
 * existiert, aber gestern – dann zählt die Streak ab gestern und gilt
 * noch als "aktiv" bis Mitternacht.
 */
export function currentStreak(entries: DiaryEntry[], now: Date = new Date()): number {
  const set = new Set(entries.map((e) => e.date))
  let streak = 0
  let cursor = new Date(now)
  // Wenn heute fehlt, von gestern starten (Streak gilt bis Mitternacht).
  if (!set.has(todayKey(cursor))) cursor = addDays(cursor, -1)
  while (set.has(todayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function longestStreak(entries: DiaryEntry[]): number {
  const set = new Set(entries.map((e) => e.date))
  let longest = 0
  for (const dateKey of set) {
    // Beginn einer Streak: Vortag fehlt
    const [y, m, d] = dateKey.split("-").map(Number)
    const prev = todayKey(addDays(new Date(y, m - 1, d), -1))
    if (set.has(prev)) continue
    // ab hier vorwärts zählen
    let len = 0
    let cursor = new Date(y, m - 1, d)
    while (set.has(todayKey(cursor))) {
      len++
      cursor = addDays(cursor, 1)
    }
    if (len > longest) longest = len
  }
  return longest
}

export function entriesCount(entries: DiaryEntry[]): number {
  return entries.length
}

export function avgMood(entries: DiaryEntry[], lastN?: number): number | null {
  const list = (lastN ? entries.slice(0, lastN) : entries).filter((e) => typeof e.mood === "number")
  if (!list.length) return null
  const sum = list.reduce((acc, e) => acc + (e.mood ?? 0), 0)
  return Math.round((sum / list.length) * 10) / 10
}
