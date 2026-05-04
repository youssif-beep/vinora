"use client"

import * as React from "react"
import type { DiaryEntry, Settings } from "./types"
import { todayKey } from "./date"

const ENTRIES_KEY = "heute.entries.v1"
const SETTINGS_KEY = "heute.settings.v1"
const EVENT_ENTRIES = "heute:entries-changed"
const EVENT_SETTINGS = "heute:settings-changed"

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function readAll(): DiaryEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as DiaryEntry[]
  } catch {
    return []
  }
}

function writeAll(entries: DiaryEntry[]): void {
  if (!isBrowser()) return
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent(EVENT_ENTRIES))
}

export function listEntries(): DiaryEntry[] {
  return readAll().sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getEntry(id: string): DiaryEntry | undefined {
  return readAll().find((e) => e.id === id)
}

export function getEntryByDate(date: string): DiaryEntry | undefined {
  return readAll().find((e) => e.date === date)
}

export function getTodayEntry(): DiaryEntry | undefined {
  return getEntryByDate(todayKey())
}

export function saveEntry(input: Omit<DiaryEntry, "id" | "createdAt" | "updatedAt"> & Partial<Pick<DiaryEntry, "id" | "createdAt">>): DiaryEntry {
  const all = readAll()
  const now = new Date().toISOString()
  let entry: DiaryEntry
  const existing = all.find((e) => e.date === input.date) ?? (input.id ? all.find((e) => e.id === input.id) : undefined)

  if (existing) {
    entry = { ...existing, ...input, id: existing.id, createdAt: existing.createdAt, updatedAt: now }
    const idx = all.findIndex((e) => e.id === existing.id)
    all[idx] = entry
  } else {
    entry = {
      id: input.id ?? uid(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      ...input,
    } as DiaryEntry
    all.push(entry)
  }
  writeAll(all)
  return entry
}

export function updateEntry(id: string, patch: Partial<DiaryEntry>): DiaryEntry | undefined {
  const all = readAll()
  const idx = all.findIndex((e) => e.id === id)
  if (idx === -1) return undefined
  const updated: DiaryEntry = { ...all[idx], ...patch, id: all[idx].id, updatedAt: new Date().toISOString() }
  all[idx] = updated
  writeAll(all)
  return updated
}

export function deleteEntry(id: string): void {
  const all = readAll().filter((e) => e.id !== id)
  writeAll(all)
}

export function exportJson(): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: readAll() }, null, 2)
}

export function importJson(json: string): { added: number; total: number } {
  const data = JSON.parse(json)
  const incoming: DiaryEntry[] = Array.isArray(data) ? data : data.entries ?? []
  const all = readAll()
  let added = 0
  for (const e of incoming) {
    if (!e?.date || !e?.id) continue
    if (all.some((x) => x.id === e.id || x.date === e.date)) continue
    all.push(e)
    added++
  }
  writeAll(all)
  return { added, total: all.length }
}

/* Settings */

export function getSettings(): Settings {
  if (!isBrowser()) return {}
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Settings) : {}
  } catch {
    return {}
  }
}

export function setSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  if (isBrowser()) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(EVENT_SETTINGS))
  }
  return next
}

export function clearAllEntries(): void {
  if (!isBrowser()) return
  localStorage.removeItem(ENTRIES_KEY)
  window.dispatchEvent(new CustomEvent(EVENT_ENTRIES))
}

/* React hooks – nutzen useSyncExternalStore, damit Server- und
 * Client-Snapshot konsistent sind und keine setState-in-effect-Lints
 * entstehen. Auf dem Server wird "leer" zurückgegeben; nach Hydration
 * ersetzt der Client-Snapshot diesen automatisch. */

const EMPTY_ENTRIES: DiaryEntry[] = []
let cachedRaw: string | null = null
let cachedEntries: DiaryEntry[] = EMPTY_ENTRIES

function entriesSnapshot(): DiaryEntry[] {
  if (!isBrowser()) return EMPTY_ENTRIES
  const raw = localStorage.getItem(ENTRIES_KEY) ?? ""
  if (raw === cachedRaw) return cachedEntries
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cachedEntries = (Array.isArray(parsed) ? (parsed as DiaryEntry[]) : []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))
  } catch {
    cachedEntries = EMPTY_ENTRIES
  }
  return cachedEntries
}

function subscribeEntries(cb: () => void) {
  if (!isBrowser()) return () => {}
  window.addEventListener(EVENT_ENTRIES, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT_ENTRIES, cb)
    window.removeEventListener("storage", cb)
  }
}

export function useEntries(): DiaryEntry[] {
  return React.useSyncExternalStore(subscribeEntries, entriesSnapshot, () => EMPTY_ENTRIES)
}

export function useEntryByDate(date: string): DiaryEntry | undefined {
  const all = useEntries()
  return React.useMemo(() => all.find((e) => e.date === date), [all, date])
}

export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}
