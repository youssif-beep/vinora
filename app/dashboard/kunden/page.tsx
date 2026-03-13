'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useVinora } from '@/lib/store'
import { fmt, fmtDate, SEGMENT_COLORS, SEGMENT_TEXT_COLORS } from '@/lib/rfm'
import { buildMessage } from '@/lib/messages'
import { locationMatch } from '@/lib/events'
import type { Customer, Segment, OrderItem } from '@/types/customer'
import { Search, SlidersHorizontal, Download, X, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const SEGMENTS = ['Top-Kunde','Loyal','Gefährdet','Eingeschlafen','Neukunde/Selten','Wachsend']

function RisikoIndicator({ signal }: { signal: string }) {
  if (signal === 'Keins') return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Keins</span>
  )
  if (signal === 'Frühwarnung') return (
    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
      style={{ background: '#FFF3E0', color: '#e67e22', borderColor: '#FBBF77' }}>
      ⚠ Frühwarnung
    </span>
  )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: '#c0392b', color: 'white' }}>
      🔴 Akut
    </span>
  )
}

function UpsellingIndicator({ signal }: { signal: string }) {
  if (signal === 'Keins') return null
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    'Frequenz gestiegen': { label: '↑ Frequenz',     color: '#1a56db', bg: '#EFF6FF', border: '#BFDBFE' },
    'Preis-Upgrade':      { label: '↑ Preis-Upgrade',color: '#7e3af2', bg: '#F5F3FF', border: '#DDD6FE' },
    'Neue Sorte':         { label: '❆ Neue Sorte',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  }
  const s = map[signal]
  if (!s) return null
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

function RfmMiniScores({ r, f, m }: { r: number; f: number; m: number }) {
  return (
    <div className="flex items-center gap-1">
      {[
        { key: 'R', val: r, color: '#6B2737' },
        { key: 'F', val: f, color: '#C9A84C' },
        { key: 'M', val: m, color: '#1a56db' },
      ].map(({ key, val, color }) => (
        <span
          key={key}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${color}18`, color }}
          title={key === 'R' ? 'Recency' : key === 'F' ? 'Frequency' : 'Monetary'}
        >
          {key}{val}
        </span>
      ))}
    </div>
  )
}

function KundenPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { customers, events, settings } = useVinora()
  const [search, setSearch] = useState('')
  const [segFilter, setSegFilter] = useState<string>(searchParams.get('segment') || '')
  const [clvFilter, setClvFilter] = useState<string>('')
  const [risikoFilter, setRisikoFilter] = useState<string>('')
  const [sortCol, setSortCol] = useState<string>('prioScore')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [selected, setSelected] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    let cs = [...customers]
    if (search) cs = cs.filter(c => `${c.vorname} ${c.nachname} ${c.email} ${c.wohnort}`.toLowerCase().includes(search.toLowerCase()))
    if (segFilter) cs = cs.filter(c => c.segment === segFilter)
    if (clvFilter) cs = cs.filter(c => c.clvTier === clvFilter)
    if (risikoFilter) cs = cs.filter(c => c.risikoSignal === risikoFilter)
    cs.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortCol]
      const vb = (b as unknown as Record<string, unknown>)[sortCol]
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? (Number(va) - Number(vb)) : (Number(vb) - Number(va))
    })
    return cs
  }, [customers, search, segFilter, clvFilter, risikoFilter, sortCol, sortDir])

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(['vorname','segment'].includes(col) ? 'asc' : 'desc') }
  }

  function exportJson() {
    const data = customers.map(c => ({
      kunde_id: c.id, vorname: c.vorname, nachname: c.nachname,
      ort: c.wohnort, plz: '', region: c.wohnort,
      segment: c.segment,
      rfm_score: { recency: c.rScore, frequency: c.fScore, monetary: c.mScore, total: c.rfmTotal },
      customer_lifetime_value: Math.round(c.clv),
      risiko_signal: c.risikoSignal,
      upselling_signal: c.upsellingSignal,
      empfohlene_massnahme: c.massnahmenTyp,
      empfohlene_weine: c.empfohleneWeine,
      bestellhistorie: c.orders.map((o: OrderItem) => ({ datum: fmtDate(o.date), wein: o.weinRaw, menge: o.flaschen, betrag: o.revenue })),
      letzter_kauf_datum: fmtDate(c.lastOrder),
      durchschn_bestellwert: Math.round(c.durchschnBestellwert * 100) / 100,
      lieblings_sorte: c.lieblingssorte,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'vinora_kunden_export.json'; a.click()
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="opacity-80" /> : <ChevronDown size={12} className="opacity-80" />
  }

  const matchingEvents = selected ? events.filter(ev => locationMatch(ev.ort, selected.wohnort)) : []
  const message = selected ? buildMessage(selected, matchingEvents, {}, {}, settings.abTestingEnabled) : ''

  if (customers.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-[#8B6070]">
          <div className="text-5xl mb-4 opacity-30">👥</div>
          <p>Bitte zuerst eine CSV-Datei importieren.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <div className={`flex-1 overflow-auto p-6 transition-all ${selected ? 'pr-0' : ''}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#1C0A0F]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Kunden</h1>
            <p className="text-sm text-[#8B6070] mt-0.5">{filtered.length} von {customers.length} Kunden</p>
          </div>
          <button onClick={exportJson} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all hover:shadow-md" style={{ background: '#1C0A0F', color: 'white' }}>
            <Download size={14} /> JSON Export
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B6070]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, Email, Ort suchen…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm bg-white focus:outline-none" style={{ borderColor: '#E8D5C0' }} />
          </div>
          <select value={segFilter} onChange={e => setSegFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-white cursor-pointer" style={{ borderColor: '#E8D5C0', color: '#1C0A0F' }}>
            <option value="">Alle Segmente</option>
            {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={clvFilter} onChange={e => setClvFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-white cursor-pointer" style={{ borderColor: '#E8D5C0', color: '#1C0A0F' }}>
            <option value="">Alle CLV</option>
            <option value="A">Tier A (&gt;10.000€)</option>
            <option value="B">Tier B (5–10k€)</option>
            <option value="C">Tier C (&lt;5.000€)</option>
          </select>
          <select value={risikoFilter} onChange={e => setRisikoFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-white cursor-pointer" style={{ borderColor: '#E8D5C0', color: '#1C0A0F' }}>
            <option value="">Alle Risiken</option>
            <option value="Akut gefährdet">Akut gefährdet</option>
            <option value="Frühwarnung">Frühwarnung</option>
            <option value="Keins">Kein Risiko</option>
          </select>
          {(search || segFilter || clvFilter || risikoFilter) && (
            <button onClick={() => { setSearch(''); setSegFilter(''); setClvFilter(''); setRisikoFilter('') }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm cursor-pointer border" style={{ borderColor: '#E8D5C0', color: '#8B6070' }}>
              <X size={13} /> Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: '#E8D5C0' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: '#F5F0EC' }}>
                {[
                  { col: 'prioScore',      label: 'Prio' },
                  { col: 'vorname',        label: 'Name' },
                  { col: 'segment',        label: 'Segment' },
                  { col: 'clvTier',        label: 'Tier / RFM' },
                  { col: 'clv',            label: 'CLV' },
                  { col: 'risikoSignal',   label: 'Risiko' },
                  { col: 'upsellingSignal',label: 'Upselling' },
                  { col: 'lieblingssorte', label: 'Lieblingssorte' },
                ].map(({ col, label }) => (
                  <th key={col} onClick={() => toggleSort(col)}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:text-[#6B2737] transition-colors border-b"
                    style={{ color: sortCol === col ? '#6B2737' : '#8B6070', borderColor: '#E8D5C0' }}>
                    <span className="flex items-center gap-1">{label} <SortIcon col={col} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#8B6070] italic">Keine Kunden gefunden.</td></tr>
              ) : filtered.map((c, i) => {
                const isSelected = selected?.id === c.id
                const prioColor = c.prioScore >= 100 ? '#c0392b' : c.prioScore >= 70 ? '#e67e22' : c.prioScore >= 40 ? '#f39c12' : '#27ae60'
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => setSelected(isSelected ? null : c)}
                    className="cursor-pointer transition-colors border-t"
                    style={{ borderColor: '#F0E8DC', background: isSelected ? '#FFF5EE' : undefined }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#FDF8F5' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-2 rounded-full bg-[#F0E8DC] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((c.prioScore/130)*100)}%`, background: prioColor }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: prioColor }}>{c.prioScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1C0A0F]">{c.vorname} {c.nachname}</div>
                      <div className="text-xs text-[#8B6070]">{c.wohnort}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: SEGMENT_COLORS[c.segment], color: SEGMENT_TEXT_COLORS[c.segment] }}>
                        {c.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white w-fit"
                          style={{ background: c.clvTier === 'A' ? '#6B2737' : c.clvTier === 'B' ? '#C9A84C' : '#ccc', color: c.clvTier === 'C' ? '#555' : 'white' }}>
                          {c.clvTier}
                        </span>
                        <RfmMiniScores r={c.rScore} f={c.fScore} m={c.mScore} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#1C0A0F] font-medium">{fmt(c.clv)}</td>
                    <td className="px-4 py-3"><RisikoIndicator signal={c.risikoSignal} /></td>
                    <td className="px-4 py-3"><UpsellingIndicator signal={c.upsellingSignal} /></td>
                    <td className="px-4 py-3 text-[#6B4A50] text-xs">{c.lieblingssorte}</td>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id || selected.vorname}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[480px] flex-shrink-0 border-l overflow-y-auto"
            style={{ borderColor: '#E8D5C0', background: '#FAFAF7' }}
          >
            <div className="sticky top-0 z-10 px-5 py-4 border-b flex items-start justify-between"
              style={{ background: 'linear-gradient(135deg, #1C0A0F, #4A1825)', borderColor: '#E8D5C0' }}>
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  {selected.vorname} {selected.nachname}
                </h2>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold border"
                    style={{ background: SEGMENT_COLORS[selected.segment], color: SEGMENT_TEXT_COLORS[selected.segment], borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', letterSpacing: '0.03em' }}>
                    {selected.segment}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ background: selected.clvTier === 'A' ? '#C9A84C' : selected.clvTier === 'B' ? '#8B6070' : '#555' }}>
                    CLV Tier {selected.clvTier}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: selected.abGroup === 'A' ? '#1a56db' : '#7e3af2', color: 'white' }}>
                    Variante {selected.abGroup}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">RFM-Scores</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Recency',   score: selected.rScore, detail: `${selected.recencyDays} Tage`,    color: '#6B2737' },
                    { label: 'Frequency', score: selected.fScore, detail: `${selected.orderCount} Käufe`,    color: '#C9A84C' },
                    { label: 'Monetary',  score: selected.mScore, detail: fmt(selected.totalRevenue),         color: '#1a56db' },
                  ].map(({ label, score, detail, color }) => {
                    const pct = score * 20
                    return (
                      <div key={label} className="bg-white rounded-xl p-3 border text-center" style={{ borderColor: '#E8D5C0' }}>
                        <div className="text-xs text-[#8B6070] mb-1">{label}</div>
                        <div className="w-full h-1.5 bg-[#F0E8DC] rounded-full mb-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="text-[10px] font-semibold mb-1" style={{ color }}>{pct}%</div>
                        <div className="text-lg font-bold" style={{ color }}>{score}<span className="text-xs text-[#8B6070]">/5</span></div>
                        <div className="text-[10px] text-[#8B6070] mt-0.5">{detail}</div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">Signale</h3>
                <div className="bg-white rounded-xl p-4 border space-y-3" style={{ borderColor: '#E8D5C0' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1C0A0F]">Risiko-Signal</span>
                    <RisikoIndicator signal={selected.risikoSignal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1C0A0F]">Upselling-Signal</span>
                    {selected.upsellingSignal === 'Keins'
                      ? <span className="text-xs text-[#8B6070]">Keins</span>
                      : <UpsellingIndicator signal={selected.upsellingSignal} />}
                  </div>
                  {selected.empfohleneWeine.length > 0 && (
                    <div>
                      <div className="text-sm text-[#1C0A0F] mb-2">Empfohlene Weine</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.empfohleneWeine.map(w => (
                          <div key={w.id} className="text-xs px-2.5 py-1 rounded-full border"
                            style={{ background: '#FFF8F0', borderColor: '#E8D5C0', color: '#6B4A50' }} title={w.reason}>
                            🍷 {w.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">Priorität & Maßnahme</h3>
                <div className="bg-white rounded-xl p-4 border flex items-center gap-4" style={{ borderColor: '#E8D5C0' }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                    style={{ background: selected.prioScore >= 100 ? '#c0392b' : selected.prioScore >= 70 ? '#e67e22' : '#27ae60' }}>
                    {selected.prioScore}
                  </div>
                  <div>
                    <div className="text-xs text-[#8B6070] mb-1">Empfohlene Maßnahme</div>
                    <div className="text-sm font-semibold text-white px-3 py-1.5 rounded-lg inline-block" style={{ background: '#6B2737' }}>
                      {selected.massnahmenTyp}
                    </div>
                  </div>
                </div>
              </section>

              <button
                onClick={() => router.push(`/dashboard/marketing?kunde=${encodeURIComponent(selected.id)}`)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all hover:opacity-90 hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)' }}
              >
                Maßnahme starten
                <ArrowRight size={15} />
              </button>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">
                  Kaufhistorie ({selected.orders.length} Käufe)
                </h3>
                <div className="space-y-0 max-h-48 overflow-y-auto pr-1 relative">
                  <div className="absolute left-[19px] top-3 bottom-3 w-px" style={{ background: '#E8D5C0' }} />
                  {selected.orders.map((o, i) => (
                    <div key={i} className="bg-white rounded-lg px-4 py-3 border flex items-start gap-3 mb-2 relative" style={{ borderColor: '#E8D5C0' }}>
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 z-10 border-2 border-white"
                        style={{ background: '#C9A84C', boxShadow: '0 0 0 2px rgba(201,168,76,0.25)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#1C0A0F] truncate">{o.weinRaw}</div>
                        <div className="text-xs text-[#8B6070]">{fmtDate(o.date)} · {fmt(o.revenue)} · {o.kanal}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {matchingEvents.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">Events in der Region</h3>
                  {matchingEvents.map(ev => (
                    <div key={ev.id} className="rounded-xl p-4 border-2 mb-2" style={{ background: '#FFFBE6', borderColor: '#C9A84C' }}>
                      <div className="font-semibold text-sm" style={{ color: '#7a5800' }}>📅 {ev.name}</div>
                      <div className="text-xs text-[#8B6070] mt-0.5">{ev.datum} · {ev.ort}</div>
                    </div>
                  ))}
                </section>
              )}

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B6070] mb-3">
                  Nachrichtenvorlage &nbsp;
                  <span className="normal-case px-1.5 py-0.5 rounded text-white text-[10px]"
                    style={{ background: selected.abGroup === 'A' ? '#1a56db' : '#7e3af2' }}>
                    Variante {selected.abGroup}
                  </span>
                </h3>
                <div className="bg-white rounded-xl p-4 border text-sm leading-relaxed whitespace-pre-wrap font-serif"
                  style={{ borderColor: '#E8D5C0', color: '#1C0A0F', fontFamily: 'Georgia, serif', fontSize: '0.85rem' }}>
                  {message}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(message)}
                  className="w-full mt-2 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)' }}>
                  Kopieren
                </button>
              </section>

              <section className="text-xs text-[#8B6070] leading-relaxed pb-4">
                <div><span className="font-medium">CLV:</span> {fmt(selected.clv)} · <span className="font-medium">Ø Bestellwert:</span> {fmt(selected.durchschnBestellwert)}</div>
                <div><span className="font-medium">Kundenjahre:</span> {selected.kundenjahre.toFixed(1)} · <span className="font-medium">Kanal:</span> {selected.bevKanal}</div>
                <div><span className="font-medium">Saison:</span> {selected.kaufsaison} · <span className="font-medium">Email:</span> {selected.email || '–'}</div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function KundenPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[#8B6070]">Lade Kundendaten…</div>}>
      <KundenPageInner />
    </Suspense>
  )
}
