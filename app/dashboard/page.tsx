'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { useVinora } from '@/lib/store'
import { runSegmentation, fmt, SEGMENT_COLORS, SEGMENT_TEXT_COLORS } from '@/lib/rfm'
import { initAutoEvents } from '@/lib/events'
import type { RawCsvRow, RawWineCsvRow, WineProduct } from '@/types/customer'
import { DEMO_ROWS } from '@/lib/demo-data'
import { motion } from 'framer-motion'
import {
  Upload, Users, TrendingUp, AlertTriangle, Zap, ArrowUp,
  BarChart3, Activity, Wine, CheckCircle2, X
} from 'lucide-react'

const SEGMENTS = ['Top-Kunde','Loyal','Gefährdet','Eingeschlafen','Neukunde/Selten','Wachsend']

export default function UebersichtPage() {
  const { customers, setCustomers, settings, events, setEvents, wineProducts, setWineProducts } = useVinora()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wineInputRef = useRef<HTMLInputElement>(null)

  const processRows = useCallback((rows: RawCsvRow[]) => {
    const cs = runSegmentation(rows, settings)
    setCustomers(cs)
    const regions = [...new Set(cs.map(c => c.wohnort).filter(Boolean))]
    const updatedEvents = initAutoEvents(events, regions)
    setEvents(updatedEvents)
  }, [settings, events, setCustomers, setEvents])

  function handleFile(file: File) {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => processRows(results.data),
    })
  }

  function handleWineFile(file: File) {
    Papa.parse<RawWineCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const wines: WineProduct[] = results.data
          .filter(r => r.Weinname)
          .map((r, i) => ({
            id: `wine_${i}`,
            weinname: r.Weinname?.trim() ?? '',
            sorte: r.Sorte?.trim() ?? '',
            preis: parseFloat(r.Preis_EUR?.replace(',', '.') ?? '0') || 0,
            kategorie: r.Kategorie?.trim() ?? '',
            jahrgang: r.Jahrgang?.trim() || undefined,
            beschreibung: r.Beschreibung?.trim() || undefined,
          }))
        setWineProducts(wines)
      },
    })
  }

  function loadDemo() {
    processRows(DEMO_ROWS)
  }

  const hasData = customers.length > 0

  // KPIs
  const totalClv = customers.reduce((s, c) => s + c.clv, 0)
  const sofort = customers.filter(c => c.prioScore >= 100).length
  const frühwarnungen = customers.filter(c => c.risikoSignal !== 'Keins').length
  const upselling = customers.filter(c => c.upsellingSignal !== 'Keins').length
  const cntA = customers.filter(c => c.abGroup === 'A').length
  const cntB = customers.filter(c => c.abGroup === 'B').length
  const total = customers.length || 1

  // CLV share per segment (for bar visualization)
  const totalClvAll = customers.reduce((s, c) => s + c.clv, 0) || 1

  const kpiContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  }

  const kpiCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  }

  const segmentContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  }

  const segmentTileVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
    },
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C0A0F]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          Übersicht
        </h1>
        <p className="text-sm text-[#8B6070] mt-1">
          {hasData ? `${customers.length} Kunden analysiert · RFM+CLV Segmentierung` : 'CSV importieren um Analyse zu starten'}
        </p>
      </div>

      {!hasData ? (
        /* Upload Screen – zwei Fenster */
        <motion.div
          className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-full max-w-3xl">
            <p className="text-sm text-[#8B6070] text-center mb-5">
              Kundendaten sind <span className="font-semibold text-[#6B2737]">Pflicht</span> · Weinkatalog ist optional
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Window 1 – Kundendaten */}
              <UploadWindow
                title="Kundendaten"
                subtitle="Bestellhistorie importieren"
                hint="Felder: Customer ID, Vorname, Nachname, Email, Kaufdatum, Wein, Anzahl_Flaschen, Gesamtpreis_EUR, Weg_der_Bestellung, Wohnort"
                icon={
                  <svg width="36" height="46" viewBox="0 0 44 56" fill="none">
                    <ellipse cx="22" cy="18" rx="14" ry="16" stroke="#6B2737" strokeWidth="2" fill="#FFF0E8" />
                    <path d="M8 18 Q8 36 22 38 Q36 36 36 18" fill="#C9A84C" fillOpacity="0.25" />
                    <line x1="22" y1="38" x2="22" y2="52" stroke="#6B2737" strokeWidth="2" strokeLinecap="round" />
                    <ellipse cx="22" cy="52" rx="10" ry="2.5" stroke="#6B2737" strokeWidth="1.5" fill="none" />
                  </svg>
                }
                accentColor="#6B2737"
                onFile={handleFile}
                inputRef={fileInputRef}
                required
              />

              {/* Window 2 – Weinkatalog */}
              <UploadWindow
                title="Weinkatalog"
                subtitle={wineProducts.length > 0 ? `✓ ${wineProducts.length} Weine geladen` : 'Sortiment importieren (optional)'}
                hint="Felder: Weinname, Sorte, Preis_EUR, Kategorie, Jahrgang, Beschreibung"
                icon={<Wine size={36} color="#C9A84C" />}
                accentColor="#C9A84C"
                onFile={handleWineFile}
                inputRef={wineInputRef}
                loaded={wineProducts.length > 0}
                onClear={() => setWineProducts([])}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-[#8B6070]">
            <div className="w-16 h-px bg-[#E8D5C0]" />
            oder
            <div className="w-16 h-px bg-[#E8D5C0]" />
          </div>
          <button
            onClick={loadDemo}
            className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer border transition-all hover:shadow-md"
            style={{ borderColor: '#6B2737', color: '#6B2737', background: 'white' }}
          >
            🧪 Demo-Daten laden (10 Beispiel-Kunden)
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          <input ref={wineInputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleWineFile(e.target.files[0]) }} />
        </motion.div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
            variants={kpiContainerVariants}
            initial="hidden"
            animate={customers.length > 0 ? 'visible' : 'hidden'}
          >
            <motion.div variants={kpiCardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <KpiCard icon={<Users size={18} />} label="Kunden gesamt" value={String(customers.length)} color="#6B2737" />
            </motion.div>
            <motion.div variants={kpiCardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <KpiCard icon={<TrendingUp size={18} />} label="Gesamt CLV" value={fmt(totalClv)} color="#C9A84C" />
            </motion.div>
            <motion.div variants={kpiCardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <KpiCard icon={<Zap size={18} />} label="Sofort-Aktionen" value={String(sofort)} color="#c0392b" alert={sofort > 0} />
            </motion.div>
            <motion.div variants={kpiCardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <KpiCard icon={<AlertTriangle size={18} />} label="Frühwarnungen" value={String(frühwarnungen)} color="#e67e22" alert={frühwarnungen > 0} />
            </motion.div>
            <motion.div variants={kpiCardVariants} whileHover={{ y: -3, transition: { duration: 0.15 } }}>
              <KpiCard icon={<ArrowUp size={18} />} label="Upselling" value={String(upselling)} color="#1a56db" />
            </motion.div>
          </motion.div>

          {/* Segment Tiles */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[#1C0A0F] uppercase tracking-wide mb-3">Kundensegmente</h2>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
              variants={segmentContainerVariants}
              initial="hidden"
              animate={customers.length > 0 ? 'visible' : 'hidden'}
            >
              {SEGMENTS.map(seg => {
                const cs = customers.filter(c => c.segment === seg)
                const clvT = cs.reduce((s, c) => s + c.clv, 0)
                const avgC = cs.length ? clvT / cs.length : 0
                const clvPct = Math.round((clvT / totalClvAll) * 100)
                return (
                  <motion.button
                    key={seg}
                    variants={segmentTileVariants}
                    whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                    onClick={() => router.push(`/dashboard/kunden?segment=${encodeURIComponent(seg)}`)}
                    className="rounded-xl text-left cursor-pointer transition-all hover:shadow-md border-2 border-transparent hover:border-black/10 overflow-hidden"
                    style={{ background: SEGMENT_COLORS[seg] }}
                  >
                    <div className="p-4 pb-3">
                      <div className="text-sm font-bold mb-1" style={{ color: SEGMENT_TEXT_COLORS[seg] }}>{seg}</div>
                      <div className="text-2xl font-bold" style={{ color: SEGMENT_TEXT_COLORS[seg] }}>{cs.length}</div>
                      <div className="text-xs mt-1" style={{ color: SEGMENT_TEXT_COLORS[seg], opacity: 0.75 }}>CLV ∅ {fmt(avgC)}</div>
                    </div>
                    {/* CLV share bar */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: SEGMENT_TEXT_COLORS[seg], opacity: 0.6 }}>CLV-Anteil</span>
                        <span className="text-[10px] font-bold" style={{ color: SEGMENT_TEXT_COLORS[seg], opacity: 0.8 }}>{clvPct}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.12)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${clvPct}%`,
                            background: SEGMENT_TEXT_COLORS[seg],
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>

          {/* A/B Test + Signale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* A/B */}
            <div className="bg-white rounded-xl p-5 border border-[#E8D5C0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} color="#6B2737" />
                <h3 className="text-sm font-semibold text-[#1C0A0F]">A/B Test – Nachrichtenvorlagen</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: `Variante A – ${cntA} Kunden`, pct: Math.round(cntA/total*100), color: '#1a56db', gradientEnd: '#3b82f6', desc: 'Klassisch, respektvoll' },
                  { label: `Variante B – ${cntB} Kunden`, pct: Math.round(cntB/total*100), color: '#7e3af2', gradientEnd: '#a855f7', desc: 'Modern, direkt' },
                ].map(({ label, pct, color, gradientEnd, desc }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-[#1C0A0F]">{label}</span>
                      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-[#F0EDE6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(to right, ${color}, ${gradientEnd})`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-[#8B6070] mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signale Summary */}
            <div className="bg-white rounded-xl p-5 border border-[#E8D5C0] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} color="#6B2737" />
                <h3 className="text-sm font-semibold text-[#1C0A0F]">Signale Übersicht</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Akut gefährdet',       count: customers.filter(c => c.risikoSignal === 'Akut gefährdet').length,     color: '#c0392b', bg: '#FFF5F5', borderLeft: '#c0392b' },
                  { label: 'Frühwarnung',           count: customers.filter(c => c.risikoSignal === 'Frühwarnung').length,         color: '#e67e22', bg: '#FFF8F0', borderLeft: '#e67e22' },
                  { label: 'Frequenz gestiegen',    count: customers.filter(c => c.upsellingSignal === 'Frequenz gestiegen').length,color: '#1a56db', bg: '#F0F4FF', borderLeft: '#1a56db' },
                  { label: 'Preis-Upgrade möglich', count: customers.filter(c => c.upsellingSignal === 'Preis-Upgrade').length,    color: '#7e3af2', bg: '#F5F0FF', borderLeft: '#7e3af2' },
                  { label: 'Neue Sorte entdeckt',   count: customers.filter(c => c.upsellingSignal === 'Neue Sorte').length,       color: '#27ae60', bg: '#F0FFF4', borderLeft: '#27ae60' },
                ].map(({ label, count, color, bg, borderLeft }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border-l-4"
                    style={{ background: bg, borderLeftColor: borderLeft }}
                  >
                    <span className="text-sm text-[#1C0A0F]">{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border transition-all hover:shadow-sm"
              style={{ borderColor: '#E8D5C0', color: '#6B4A50', background: 'white' }}
            >
              <Upload size={14} /> Kundendaten neu laden
            </button>
            {wineProducts.length > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: '#C9A84C', color: '#7a5800', background: '#FFFAEE' }}>
                <CheckCircle2 size={14} style={{ color: '#C9A84C' }} />
                {wineProducts.length} Weine geladen
                <button
                  onClick={() => wineInputRef.current?.click()}
                  className="underline text-xs text-[#8B6070] cursor-pointer hover:text-[#6B2737]"
                >neu laden</button>
                <button onClick={() => setWineProducts([])} className="cursor-pointer hover:text-red-600">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => wineInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border transition-all hover:shadow-sm"
                style={{ borderColor: '#C9A84C', color: '#7a5800', background: 'white' }}
              >
                <Wine size={14} /> Weinkatalog laden
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            <input ref={wineInputRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleWineFile(e.target.files[0]) }} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── UploadWindow ─────────────────────────────────────────────────────────────

function UploadWindow({
  title, subtitle, hint, icon, accentColor, onFile, inputRef, required, loaded, onClear,
}: {
  title: string
  subtitle: string
  hint: string
  icon: React.ReactNode
  accentColor: string
  onFile: (f: File) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  required?: boolean
  loaded?: boolean
  onClear?: () => void
}) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      transition={{ duration: 0.15 }}
      className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all bg-white"
      style={{ borderColor: loaded ? accentColor : '#E8D5C0' }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = accentColor }}
      onDragLeave={e => { e.currentTarget.style.borderColor = loaded ? accentColor : '#E8D5C0' }}
      onDrop={e => {
        e.preventDefault()
        e.currentTarget.style.borderColor = loaded ? accentColor : '#E8D5C0'
        const file = e.dataTransfer.files[0]
        if (file) onFile(file)
      }}
    >
      {required && (
        <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: '#6B273710', color: '#6B2737' }}>Pflicht</span>
      )}
      {loaded && onClear && (
        <button
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors"
          style={{ color: '#8B6070' }}
          onClick={e => { e.stopPropagation(); onClear() }}
        >
          <X size={12} />
        </button>
      )}

      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${accentColor}10` }}>
        {loaded
          ? <CheckCircle2 size={32} style={{ color: accentColor }} />
          : icon}
      </div>

      <h3 className="text-base font-semibold text-[#1C0A0F] mb-1"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
        {title}
      </h3>
      <p className="text-sm mb-4" style={{ color: loaded ? accentColor : '#8B6070', fontWeight: loaded ? 600 : 400 }}>
        {subtitle}
      </p>

      {!loaded && (
        <>
          <p className="text-[11px] text-[#B09090] mb-5 leading-relaxed">{hint}</p>
          <button
            className="px-5 py-2 rounded-xl text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
            onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          >
            CSV auswählen
          </button>
        </>
      )}
    </motion.div>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color, alert = false }: {
  icon: React.ReactNode; label: string; value: string; color: string; alert?: boolean
}) {
  return (
    <div
      className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default"
      style={{ borderColor: alert ? color : '#E8D5C0' }}
    >
      {/* Top color stripe */}
      <div className="h-1 rounded-t-xl" style={{ background: color }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
            {icon}
          </div>
          <span className="text-xs text-[#8B6070] font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-xl font-bold" style={{ color: alert ? color : '#1C0A0F' }}>{value}</div>
      </div>
    </div>
  )
}
