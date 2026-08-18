'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { VinoraContext, DEFAULT_SETTINGS } from '@/lib/store'
import type { RfmSettings } from '@/lib/rfm'
import type { Customer, WineProduct, VinoraSavedEvent, MarketingAction, Campaign, RawCsvRow } from '@/types/customer'
import { initAutoEvents } from '@/lib/events'
import { runSegmentation } from '@/lib/rfm'
import {
  loadSnapshot, saveKey, createBackup, listBackups, readBackup, writeSnapshot,
  downloadBackupFile, parseBackupFile, mergeCustomers,
  type BackupEntry, type VinoraSnapshot,
} from '@/lib/persist'

export function VinoraProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [customers, setCustomersState] = useState<Customer[]>([])
  const [settings, setSettingsState] = useState<RfmSettings>(DEFAULT_SETTINGS)
  const [events, setEventsState] = useState<VinoraSavedEvent[]>([])
  const [actions, setActionsState] = useState<MarketingAction[]>([])
  const [wineProducts, setWineProductsState] = useState<WineProduct[]>([])
  const [campaigns, setCampaignsState] = useState<Campaign[]>([])
  const [rawRows, setRawRowsState] = useState<RawCsvRow[]>([])
  const [templatesA, setTemplatesAState] = useState<Record<string, string>>({})
  const [templatesB, setTemplatesBState] = useState<Record<string, string>>({})
  const [backups, setBackups] = useState<BackupEntry[]>([])

  // Für snapshot() ohne Abhängigkeit vom Render-Zyklus
  const stateRef = useRef<VinoraSnapshot>({
    customers: [], settings: null, events: [], actions: [], wineProducts: [], campaigns: [], rawRows: [], templatesA: {}, templatesB: {},
  })
  useEffect(() => {
    stateRef.current = { customers, settings, events, actions, wineProducts, campaigns, rawRows, templatesA, templatesB }
  })

  const snapshot = useCallback((): VinoraSnapshot => stateRef.current, [])

  const refreshBackups = useCallback(async () => {
    setBackups(await listBackups())
  }, [])

  // Laden beim Start – inklusive einmaliger Übernahme alter localStorage-Daten
  useEffect(() => {
    let abgebrochen = false
    ;(async () => {
      const snap = await loadSnapshot()
      if (abgebrochen) return
      setCustomersState(snap.customers)
      if (snap.settings) setSettingsState({ ...DEFAULT_SETTINGS, ...snap.settings })
      setEventsState(initAutoEvents(snap.events ?? [], []))
      setActionsState(snap.actions ?? [])
      setWineProductsState(snap.wineProducts ?? [])
      setCampaignsState(snap.campaigns ?? [])
      setRawRowsState(snap.rawRows ?? [])
      setTemplatesAState(snap.templatesA ?? {})
      setTemplatesBState(snap.templatesB ?? {})
      setReady(true)
      refreshBackups()
    })()
    return () => { abgebrochen = true }
  }, [refreshBackups])

  function setSettings(s: RfmSettings) {
    setSettingsState(s)
    saveKey('settings', s)
    // Schwellwerte wirken sofort auf Segmente, Risiko und Prognose
    const { rawRows: rows, wineProducts: w, customers: alt } = stateRef.current
    if (rows.length > 0) {
      const neu = mergeCustomers(runSegmentation(rows, s, w), alt)
      setCustomersState(neu)
      saveKey('customers', neu)
    }
  }

  function setEvents(e: VinoraSavedEvent[]) {
    setEventsState(e)
    saveKey('events', e)
  }

  function setActions(a: MarketingAction[]) {
    setActionsState(a)
    saveKey('actions', a)
  }

  function setCampaigns(c: Campaign[]) {
    setCampaignsState(c)
    saveKey('campaigns', c)
  }

  /** Katalog wechseln – die Weinempfehlungen hängen daran und werden mitgezogen. */
  function setWineProducts(w: WineProduct[]) {
    setWineProductsState(w)
    saveKey('wineProducts', w)
    const { rawRows: rows, settings: s, customers: alt } = stateRef.current
    if (rows.length > 0) {
      const neu = mergeCustomers(runSegmentation(rows, s ?? DEFAULT_SETTINGS, w), alt)
      setCustomersState(neu)
      saveKey('customers', neu)
    }
  }

  /**
   * Rohzeilen importieren. Der bisherige Stand wandert vorher in die Sicherung,
   * danach werden erfasste Rückmeldungen auf die neuen Datensätze übertragen.
   */
  function importRows(rows: RawCsvRow[]) {
    const vorher = stateRef.current
    if (vorher.customers.length > 0) {
      createBackup(vorher, `Vor Import (${vorher.customers.length} Kunden)`).then(refreshBackups)
    }
    const gerechnet = runSegmentation(rows, vorher.settings ?? DEFAULT_SETTINGS, vorher.wineProducts)
    const zusammengefuehrt = vorher.customers.length > 0 ? mergeCustomers(gerechnet, vorher.customers) : gerechnet
    setRawRowsState(rows)
    setCustomersState(zusammengefuehrt)
    saveKey('rawRows', rows)
    saveKey('customers', zusammengefuehrt)
  }

  function setTemplates(variante: 'A' | 'B', t: Record<string, string>) {
    if (variante === 'A') { setTemplatesAState(t); saveKey('templatesA', t) }
    else { setTemplatesBState(t); saveKey('templatesB', t) }
  }

  function exportBackup() {
    downloadBackupFile(stateRef.current)
  }

  const applySnapshot = useCallback((snap: VinoraSnapshot) => {
    setCustomersState(snap.customers ?? [])
    setSettingsState({ ...DEFAULT_SETTINGS, ...(snap.settings ?? {}) })
    setEventsState(snap.events ?? [])
    setActionsState(snap.actions ?? [])
    setWineProductsState(snap.wineProducts ?? [])
    setCampaignsState(snap.campaigns ?? [])
    setRawRowsState(snap.rawRows ?? [])
    setTemplatesAState(snap.templatesA ?? {})
    setTemplatesBState(snap.templatesB ?? {})
  }, [])

  const restoreBackup = useCallback(async (id: number) => {
    const snap = await readBackup(id)
    if (!snap) throw new Error('Sicherung nicht gefunden')
    await createBackup(stateRef.current, 'Vor Wiederherstellung')
    applySnapshot(snap)
    await writeSnapshot(snap)
    await refreshBackups()
  }, [applySnapshot, refreshBackups])

  const importBackup = useCallback(async (file: File) => {
    const snap = await parseBackupFile(file)
    await createBackup(stateRef.current, 'Vor Datei-Import')
    applySnapshot(snap)
    await writeSnapshot(snap)
    await refreshBackups()
  }, [applySnapshot, refreshBackups])

  return (
    <VinoraContext.Provider value={{
      ready,
      customers, importRows, rawRows,
      settings, setSettings,
      events, setEvents,
      actions, setActions,
      wineProducts, setWineProducts,
      campaigns, setCampaigns,
      templatesA, templatesB, setTemplates,
      snapshot, backups, refreshBackups, restoreBackup, exportBackup, importBackup,
    }}>
      {children}
    </VinoraContext.Provider>
  )
}
