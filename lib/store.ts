'use client'
// Simple in-memory store shared across dashboard pages via context
import { createContext, useContext } from 'react'
import type { RfmSettings } from '@/lib/rfm'
import type { Customer, VinoraSavedEvent, MarketingAction, WineProduct } from '@/types/customer'
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
  wineProducts: WineProduct[]
  setWineProducts: (w: WineProduct[]) => void
}

export const VinoraContext = createContext<VinoraSt>({
  customers: [], setCustomers: () => {},
  settings: DEFAULT_SETTINGS, setSettings: () => {},
  events: [], setEvents: () => {},
  actions: [], setActions: () => {},
  wineProducts: [], setWineProducts: () => {},
})

export function useVinora() {
  return useContext(VinoraContext)
}
