'use client'
import { createContext, useContext } from 'react'
import type { RfmSettings } from '@/lib/rfm'
import type { Customer, VinoraSavedEvent, MarketingAction } from '@/types/customer'
import { DEFAULT_SETTINGS } from '@/lib/rfm'

export { DEFAULT_SETTINGS }
export type { RfmSettings }

export interface VinoraSt {
  customers: Customer[]
  setCustomers: (c: Customer[]) => void
  settings: RfmSettings
  setSettings: (s: RfmSettings) => void
  events: VinoraSavedEvent[]
  setEvents: (e: VinoraSavedEvent[]) => void
  actions: MarketingAction[]
  setActions: (a: MarketingAction[]) => void
}

export const VinoraContext = createContext<VinoraSt>({
  customers: [], setCustomers: () => {},
  settings: DEFAULT_SETTINGS, setSettings: () => {},
  events: [], setEvents: () => {},
  actions: [], setActions: () => {},
})

export function useVinora() {
  return useContext(VinoraContext)
}
