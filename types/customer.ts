// Wine catalog – uploaded separately (Simon liefert die Daten)
export interface RawWineCsvRow {
  Weinname: string
  Sorte: string
  Preis_EUR: string
  Kategorie: string
  Jahrgang?: string
  Beschreibung?: string
}

export interface WineProduct {
  id: string
  weinname: string
  sorte: string
  preis: number
  kategorie: string
  jahrgang?: string
  beschreibung?: string
}

// Input-Spezifikation (definiert im Meeting 6. März 2026 mit Simon)
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

export type Segment =
  | 'Top-Kunde'
  | 'Loyal'
  | 'Gefährdet'
  | 'Eingeschlafen'
  | 'Neukunde/Selten'
  | 'Wachsend'

export type ClvTier = 'A' | 'B' | 'C'
export type AbGroup = 'A' | 'B'
export type RisikoSignal = 'Keins' | 'Frühwarnung' | 'Akut gefährdet'
export type UpsellingSignal = 'Keins' | 'Frequenz gestiegen' | 'Preis-Upgrade' | 'Neue Sorte'

export interface WineRecommendation {
  id: string
  name: string
  reason: string
}

export interface Customer {
  // Identifikation
  id: string
  vorname: string
  nachname: string
  email: string
  wohnort: string

  // Kaufhistorie
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

  // RFM Scores (1–5)
  rScore: number
  fScore: number
  mScore: number
  rfmTotal: number

  // CLV
  kundenjahre: number
  clv: number
  clvTier: ClvTier

  // Segmentierung
  segment: Segment
  prioScore: number

  // Signale (Simon's Analytics)
  risikoSignal: RisikoSignal
  upsellingSignal: UpsellingSignal
  empfohleneWeine: WineRecommendation[]

  // Marketing
  massnahmenTyp: string
  abGroup: AbGroup

  // Feedback-Loop
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
  frühwarnungen: number
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
