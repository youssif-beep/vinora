export interface RawCsvRow {
  'Customer ID': string
  Vorname: string
  Nachname: string
  Email: string
  Kaufdatum: string
  Wein: string
  Anzahl_Flaschen: string
  Gesamtpreis_EUR: string
  Weg_der_Bestellung: string
  Wohnort: string
}

export interface OrderItem {
  date: Date | null
  weinRaw: string
  weinBase: string
  revenue: number
  kanal: string
  flaschen: number
}

export type Segment = 'Top-Kunde' | 'Loyal' | 'Gef\u00e4hrdet' | 'Eingeschlafen' | 'Neukunde/Selten' | 'Wachsend'
export type ClvTier = 'A' | 'B' | 'C'
export type AbGroup = 'A' | 'B'
export type RisikoSignal = 'Keins' | 'Fr\u00fchwarnung' | 'Akut gef\u00e4hrdet'
export type UpsellingSignal = 'Keins' | 'Frequenz gestiegen' | 'Preis-Upgrade' | 'Neue Sorte'

export interface WineRecommendation {
  id: string
  name: string
  reason: string
}

export interface Customer {
  id: string
  vorname: string
  nachname: string
  email: string
  wohnort: string
  orders: OrderItem[]
  totalRevenue: number
  orderCount: number
  firstOrder: Date | null
  lastOrder: Date | null
  recencyDays: number
  lieblingssorte: string
  bevKanal: string
  kaufsaison: string
  durchschnBestellwert: number
  rScore: number
  fScore: number
  mScore: number
  rfmTotal: number
  kundenjahre: number
  clv: number
  clvTier: ClvTier
  segment: Segment
  prioScore: number
  risikoSignal: RisikoSignal
  upsellingSignal: UpsellingSignal
  empfohleneWeine: WineRecommendation[]
  massnahmenTyp: string
  abGroup: AbGroup
  lastActionSentAt?: string
  lastActionOutcome?: 'ausstehend' | 'positiv' | 'negativ' | 'keine_reaktion'
}

export interface SegmentStats {
  segment: Segment
  count: number
  totalClv: number
  avgClv: number
  color: string
}

export interface KpiData {
  totalCustomers: number
  totalClv: number
  sofortAktionen: number
  fr\u00fchwarnungen: number
  upsellingPotenziale: number
  abCountA: number
  abCountB: number
}

export interface MarketingAction {
  id: string
  customerId: string
  customerName: string
  massnahmenTyp: string
  segment: Segment
  clvTier: ClvTier
  sentAt: string
  outcome: 'ausstehend' | 'positiv' | 'negativ' | 'keine_reaktion'
  notes?: string
}

export interface VinoraSavedEvent {
  id: string
  name: string
  datum: string
  ort: string
  typ: string
  notiz: string
  auto?: boolean
}
