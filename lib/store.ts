'use client'
// Gemeinsamer Zustand aller Dashboard-Seiten. Persistiert lokal über lib/persist.ts.
import { createContext, useContext } from 'react'
import type { RfmSettings } from '@/lib/rfm'
import type { Customer, VinoraSavedEvent, MarketingAction, WineProduct, Campaign, RawCsvRow } from '@/types/customer'
import type { BackupEntry, VinoraSnapshot } from '@/lib/persist'
import { DEFAULT_SETTINGS } from '@/lib/rfm'

export { DEFAULT_SETTINGS }
export type { RfmSettings }

export interface VinoraSt {
  ready: boolean
  customers: Customer[]
  /** Rohzeilen importieren: segmentiert, sichert den alten Stand und führt Rückmeldungen mit. */
  importRows: (rows: RawCsvRow[]) => void
  rawRows: RawCsvRow[]
  settings: RfmSettings
  setSettings: (s: RfmSettings) => void
  events: VinoraSavedEvent[]
  setEvents: (e: VinoraSavedEvent[]) => void
  actions: MarketingAction[]
  setActions: (a: MarketingAction[]) => void
  wineProducts: WineProduct[]
  setWineProducts: (w: WineProduct[]) => void
  campaigns: Campaign[]
  setCampaigns: (c: Campaign[]) => void
  templatesA: Record<string, string>
  templatesB: Record<string, string>
  setTemplates: (variante: 'A' | 'B', t: Record<string, string>) => void
  // Sicherung
  snapshot: () => VinoraSnapshot
  backups: BackupEntry[]
  refreshBackups: () => Promise<void>
  restoreBackup: (id: number) => Promise<void>
  exportBackup: () => void
  importBackup: (file: File) => Promise<void>
}

export const VinoraContext = createContext<VinoraSt>({
  ready: false,
  customers: [], importRows: () => {}, rawRows: [],
  settings: DEFAULT_SETTINGS, setSettings: () => {},
  events: [], setEvents: () => {},
  actions: [], setActions: () => {},
  wineProducts: [], setWineProducts: () => {},
  campaigns: [], setCampaigns: () => {},
  templatesA: {}, templatesB: {}, setTemplates: () => {},
  snapshot: () => ({ customers: [], settings: null, events: [], actions: [], wineProducts: [], campaigns: [], rawRows: [], templatesA: {}, templatesB: {} }),
  backups: [], refreshBackups: async () => {}, restoreBackup: async () => {},
  exportBackup: () => {}, importBackup: async () => {},
})

export function useVinora() {
  return useContext(VinoraContext)
}
