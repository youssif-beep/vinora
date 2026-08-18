'use client'

/**
 * Lokale, verlustsichere Persistenz.
 *
 * Alles bleibt auf dem Rechner des Weinguts – keine Cloud, kein Server.
 * Gegenüber der früheren localStorage-Lösung:
 *   – IndexedDB statt localStorage (kein 5-MB-Limit, kein stiller Quota-Abbruch)
 *   – automatische Snapshots vor jedem Import (Rückgängig-Punkt)
 *   – Backup-Datei zum Exportieren/Einspielen (Rechnerwechsel, Sicherung)
 *   – Merge statt Überschreiben: erfasste Rückmeldungen überleben jeden Re-Import
 */

import type { Customer, VinoraSavedEvent, MarketingAction, WineProduct, Campaign, RawCsvRow } from '@/types/customer'
import type { RfmSettings } from '@/lib/rfm'

const DB_NAME = 'vinora'
const DB_VERSION = 1
const STORE_KV = 'kv'
const STORE_BACKUPS = 'backups'
const MAX_AUTO_BACKUPS = 20

export interface VinoraSnapshot {
  customers: Customer[]
  settings: RfmSettings | null
  events: VinoraSavedEvent[]
  actions: MarketingAction[]
  wineProducts: WineProduct[]
  campaigns: Campaign[]
  /** Importierte Rohzeilen – ohne sie ließe sich nach einer Änderung der
   *  Schwellwerte oder des Katalogs nichts neu berechnen. */
  rawRows: RawCsvRow[]
  /** Eigene Nachrichtenvorlagen je A/B-Variante – vorher gingen sie beim Seitenwechsel verloren. */
  templatesA: Record<string, string>
  templatesB: Record<string, string>
}

export interface BackupEntry {
  id: number
  createdAt: string
  label: string
  customerCount: number
  actionCount: number
}

export const EMPTY_SNAPSHOT: VinoraSnapshot = {
  customers: [], settings: null, events: [], actions: [], wineProducts: [], campaigns: [], rawRows: [], templatesA: {}, templatesB: {},
}

const KV_KEYS: Record<keyof VinoraSnapshot, string> = {
  customers: 'customers',
  settings: 'settings',
  events: 'events',
  actions: 'actions',
  wineProducts: 'wineProducts',
  campaigns: 'campaigns',
  rawRows: 'rawRows',
  templatesA: 'templatesA',
  templatesB: 'templatesB',
}

/** Alte localStorage-Schlüssel – werden einmalig übernommen und danach in Ruhe gelassen. */
const LEGACY_KEYS: Record<keyof VinoraSnapshot, string> = {
  customers: 'vinora_customers',
  settings: 'vinora_settings',
  events: 'vinora_events',
  actions: 'vinora_actions',
  wineProducts: 'vinora_wines',
  campaigns: 'vinora_campaigns',
  rawRows: 'vinora_raw_rows',
  templatesA: 'vinora_templates_a',
  templatesB: 'vinora_templates_b',
}

// ---------------------------------------------------------------- IndexedDB

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV)
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        db.createObjectStore(STORE_BACKUPS, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const req = fn(transaction.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

// ------------------------------------------------------------------- Dates

/** JSON kennt keine Dates – beim Laden zurückverwandeln, sonst bricht jede Neuberechnung. */
function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}

export function reviveCustomer(c: Customer): Customer {
  return {
    ...c,
    firstOrder: toDate(c.firstOrder),
    lastOrder: toDate(c.lastOrder),
    orders: (c.orders || []).map(o => ({ ...o, date: toDate(o.date) })),
  }
}

// -------------------------------------------------------------------- Load

/** Liest den kompletten Zustand. Fällt bei fehlender IndexedDB auf localStorage zurück. */
export async function loadSnapshot(): Promise<VinoraSnapshot> {
  try {
    const snap = { ...EMPTY_SNAPSHOT }
    let empty = true
    for (const key of Object.keys(KV_KEYS) as (keyof VinoraSnapshot)[]) {
      const value = await tx<unknown>(STORE_KV, 'readonly', s => s.get(KV_KEYS[key]))
      if (value !== undefined && value !== null) {
        empty = false
        ;(snap as Record<string, unknown>)[key] = value
      }
    }
    if (empty) {
      const legacy = readLegacy()
      if (legacy) {
        await writeSnapshot(legacy)
        return normalize(legacy)
      }
    }
    return normalize(snap)
  } catch {
    return normalize(readLegacy() ?? EMPTY_SNAPSHOT)
  }
}

function normalize(snap: VinoraSnapshot): VinoraSnapshot {
  return { ...snap, customers: (snap.customers || []).map(reviveCustomer) }
}

function readLegacy(): VinoraSnapshot | null {
  if (typeof localStorage === 'undefined') return null
  let found = false
  const snap = { ...EMPTY_SNAPSHOT }
  for (const key of Object.keys(LEGACY_KEYS) as (keyof VinoraSnapshot)[]) {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS[key])
      if (raw) {
        found = true
        ;(snap as Record<string, unknown>)[key] = JSON.parse(raw)
      }
    } catch { /* beschädigter Eintrag – Rest trotzdem übernehmen */ }
  }
  return found ? snap : null
}

// ------------------------------------------------------------------- Write

export async function saveKey<K extends keyof VinoraSnapshot>(key: K, value: VinoraSnapshot[K]): Promise<void> {
  await tx(STORE_KV, 'readwrite', s => s.put(value, KV_KEYS[key]))
}

export async function writeSnapshot(snap: VinoraSnapshot): Promise<void> {
  for (const key of Object.keys(KV_KEYS) as (keyof VinoraSnapshot)[]) {
    await saveKey(key, snap[key] as never)
  }
}

// ----------------------------------------------------------------- Backups

/** Snapshot in die Backup-Historie legen. Wird vor jedem Import automatisch aufgerufen. */
export async function createBackup(snap: VinoraSnapshot, label: string): Promise<void> {
  try {
    await tx(STORE_BACKUPS, 'readwrite', s => s.add({
      createdAt: new Date().toISOString(),
      label,
      customerCount: snap.customers.length,
      actionCount: snap.actions.length,
      data: snap,
    }))
    await pruneBackups()
  } catch { /* Backup ist Kür – darf den Import nie blockieren */ }
}

async function pruneBackups(): Promise<void> {
  const all = await tx<Array<{ id: number }>>(STORE_BACKUPS, 'readonly', s => s.getAll())
  const excess = all.length - MAX_AUTO_BACKUPS
  if (excess <= 0) return
  const oldest = all.sort((a, b) => a.id - b.id).slice(0, excess)
  for (const entry of oldest) {
    await tx(STORE_BACKUPS, 'readwrite', s => s.delete(entry.id))
  }
}

export async function listBackups(): Promise<BackupEntry[]> {
  try {
    const all = await tx<Array<BackupEntry & { data: VinoraSnapshot }>>(STORE_BACKUPS, 'readonly', s => s.getAll())
    return all
      .map(({ id, createdAt, label, customerCount, actionCount }) => ({ id, createdAt, label, customerCount, actionCount }))
      .sort((a, b) => b.id - a.id)
  } catch {
    return []
  }
}

export async function readBackup(id: number): Promise<VinoraSnapshot | null> {
  try {
    const entry = await tx<{ data: VinoraSnapshot } | undefined>(STORE_BACKUPS, 'readonly', s => s.get(id))
    return entry ? normalize(entry.data) : null
  } catch {
    return null
  }
}

// ------------------------------------------------------- Datei-Import/Export

export interface BackupFile {
  format: 'vinora-backup'
  version: 1
  exportedAt: string
  data: VinoraSnapshot
}

export function downloadBackupFile(snap: VinoraSnapshot): void {
  const payload: BackupFile = {
    format: 'vinora-backup', version: 1, exportedAt: new Date().toISOString(), data: snap,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `vinora_backup_${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseBackupFile(file: File): Promise<VinoraSnapshot> {
  const text = await file.text()
  const parsed = JSON.parse(text) as BackupFile | VinoraSnapshot
  const data = 'format' in parsed && parsed.format === 'vinora-backup' ? parsed.data : (parsed as VinoraSnapshot)
  if (!data || !Array.isArray(data.customers)) throw new Error('Keine gültige Vinora-Sicherung')
  return normalize({ ...EMPTY_SNAPSHOT, ...data })
}

// ------------------------------------------------------------------- Merge

/**
 * Neue Kundenliste übernehmen, ohne Erfasstes zu verlieren.
 * Ein Re-Import bringt frische Bestellungen – die Rückmeldungen zu bereits
 * versendeten Maßnahmen hängen aber am alten Datensatz und müssen mitwandern.
 */
export function mergeCustomers(incoming: Customer[], existing: Customer[]): Customer[] {
  const byId = new Map(existing.map(c => [c.id, c]))
  return incoming.map(c => {
    const old = byId.get(c.id)
    if (!old) return c
    return {
      ...c,
      lastActionSentAt: old.lastActionSentAt ?? c.lastActionSentAt,
      lastActionOutcome: old.lastActionOutcome ?? c.lastActionOutcome,
    }
  })
}
