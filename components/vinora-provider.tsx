'use client'

import { useState, useEffect } from 'react'
import { VinoraContext, DEFAULT_SETTINGS } from '@/lib/store'
import type { RfmSettings } from '@/lib/rfm'
import type { Customer, WineProduct } from '@/types/customer'
import type { VinoraSavedEvent, MarketingAction } from '@/types/customer'
import { initAutoEvents } from '@/lib/events'

export function VinoraProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettingsState] = useState<RfmSettings>(DEFAULT_SETTINGS)
  const [events, setEventsState] = useState<VinoraSavedEvent[]>([])
  const [actions, setActionsState] = useState<MarketingAction[]>([])
  const [wineProducts, setWineProductsState] = useState<WineProduct[]>([])

  // Load persisted data on mount
  useEffect(() => {
    try {
      const savedCustomers = localStorage.getItem('vinora_customers')
      if (savedCustomers) setCustomers(JSON.parse(savedCustomers))
      const savedSettings = localStorage.getItem('vinora_settings')
      if (savedSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
      const savedEvents = localStorage.getItem('vinora_events')
      const parsed: VinoraSavedEvent[] = savedEvents ? JSON.parse(savedEvents) : []
      const withAuto = initAutoEvents(parsed, [])
      setEventsState(withAuto)
      const savedActions = localStorage.getItem('vinora_actions')
      if (savedActions) setActionsState(JSON.parse(savedActions))
      const savedWines = localStorage.getItem('vinora_wines')
      if (savedWines) setWineProductsState(JSON.parse(savedWines))
    } catch { /* ignore */ }
  }, [])

  function setSettings(s: RfmSettings) {
    setSettingsState(s)
    localStorage.setItem('vinora_settings', JSON.stringify(s))
  }

  function setEvents(e: VinoraSavedEvent[]) {
    setEventsState(e)
    localStorage.setItem('vinora_events', JSON.stringify(e))
  }

  function setActions(a: MarketingAction[]) {
    setActionsState(a)
    localStorage.setItem('vinora_actions', JSON.stringify(a))
  }

  function setCustomersPersisted(c: Customer[]) {
    setCustomers(c)
    try { localStorage.setItem('vinora_customers', JSON.stringify(c)) } catch { /* ignore */ }
  }

  function setWineProducts(w: WineProduct[]) {
    setWineProductsState(w)
    try { localStorage.setItem('vinora_wines', JSON.stringify(w)) } catch { /* ignore */ }
  }

  return (
    <VinoraContext.Provider value={{
      customers, setCustomers: setCustomersPersisted,
      settings, setSettings,
      events, setEvents,
      actions, setActions,
      wineProducts, setWineProducts,
    }}>
      {children}
    </VinoraContext.Provider>
  )
}
