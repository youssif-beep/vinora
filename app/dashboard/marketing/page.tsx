'use client'

import { useState, useCallback, useEffect } from 'react'
import { useVinora } from '@/lib/store'
import { fmt, SEGMENT_COLORS, SEGMENT_TEXT_COLORS } from '@/lib/rfm'
import type { Customer, MarketingAction, Segment } from '@/types/customer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, CheckCircle, Clock, XCircle, Minus, Send, TrendingUp,
  AlertTriangle, Copy, ChevronDown, BarChart2, RefreshCw, Filter,
} from 'lucide-react'

type OutcomeKey = 'positiv' | 'negativ' | 'keine_reaktion' | 'ausstehend'

const OUTCOME_LABELS: Record<OutcomeKey, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ausstehend:     { label: 'Ausstehend',    icon: <Clock size={13} />,       color: '#e67e22', bg: '#FEF3E2' },
  positiv:        { label: 'Positiv',        icon: <CheckCircle size={13} />, color: '#27ae60', bg: '#E8F8F1' },
  negativ:        { label: 'Negativ',        icon: <XCircle size={13} />,     color: '#c0392b', bg: '#FDECEA' },
  keine_reaktion: { label: 'Keine Reaktion', icon: <Minus size={13} />,       color: '#8B6070', bg: '#F2ECF0' },
}

const MASSNAHMEN_SUCCESS_RATES: Record<string, number> = {
  'Persönliche Einladung': 82, 'VIP-Angebot': 74, 'Treue-Anerkennung': 68,
  'Cross-Sell Empfehlung': 71, 'Newsletter + Rabatt': 58, 'Sofort: Persönlicher Anruf': 88,
  'Reaktivierung mit Probe': 65, 'Persönliche Reaktivierung': 79, 'Reaktivierung mit Rabatt': 61,
  'Kundenbindung aufbauen': 54, 'Förderung + Weinprobe': 63, 'Persönlicher Anruf': 85,
  'WhatsApp Nachricht': 72, 'Handgeschriebene Postkarte': 76, 'VIP Event Einladung': 81,
  'Weinprobe zu Hause': 77,
}

const MASSNAHMEN_TYPES = [
  'E-Mail','SMS','Brief','Persönlicher Anruf','WhatsApp Nachricht','Handgeschriebene Postkarte',
  'VIP Event Einladung','Weinprobe zu Hause','Persönliche Einladung','VIP-Angebot',
  'Treue-Anerkennung','Cross-Sell Empfehlung','Newsletter + Rabatt','Sofort: Persönlicher Anruf',
  'Reaktivierung mit Probe','Persönliche Reaktivierung','Reaktivierung mit Rabatt',
  'Kundenbindung aufbauen','Förderung + Weinprobe',
]

const MASSNAHMEN_CHIPS = [
  { label: 'E-Mail',    value: 'E-Mail' },
  { label: 'SMS',       value: 'SMS' },
  { label: 'Brief',     value: 'Brief' },
  { label: 'Anruf',     value: 'Persönlicher Anruf' },
  { label: 'Postkarte', value: 'Handgeschriebene Postkarte' },
  { label: 'WhatsApp',  value: 'WhatsApp Nachricht' },
  { label: 'VIP Event', value: 'VIP Event Einladung' },
  { label: 'Weinprobe', value: 'Weinprobe zu Hause' },
]

const ALL_SEGMENTS: Segment[] = ['Top-Kunde','Loyal','Gefährdet','Eingeschlafen','Neukunde/Selten','Wachsend']

function highlightTemplateVars(text: string): React.ReactNode[] {
  const regex = /(\[[^\]]+\])/g
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ color: '#C9A84C', fontWeight: 600 }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

function renderAiText(text: string): React.ReactNode {
  const boldRegex = /\*\*(.*?)\*\*/g
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const segments: React.ReactNode[] = []
        let last = 0
        let match: RegExpExecArray | null
        boldRegex.lastIndex = 0
        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > last) segments.push(...highlightTemplateVars(line.slice(last, match.index)))
          segments.push(<strong key={`b${li}-${match.index}`}>{match[1]}</strong>)
          last = match.index + match[0].length
        }
        if (last < line.length) segments.push(...highlightTemplateVars(line.slice(last)))
        return <span key={li}>{segments}{li < lines.length - 1 && <br />}</span>
      })}
    </>
  )
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i))
      i++
      if (i > text.length) clearInterval(interval)
    }, 8)
    return () => clearInterval(interval)
  }, [text])
  return (
    <span>
      {renderAiText(displayed)}
      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
        style={{ borderRight: '2px solid #C9A84C', marginLeft: 1 }} />
    </span>
  )
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300"
      style={{ background: '#22c55e', color: 'white', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', pointerEvents: 'none' }}>
      <CheckCircle size={15} /> {message}
    </div>
  )
}

export default function MarketingPage() {
  const { customers, actions, setActions } = useVinora()
  const [selected, setSelected] = useState<Customer | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [activeTab, setActiveTab] = useState<'workflow' | 'feedback'>('workflow')
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'Alle'>('Alle')
  const [selectedMassnahmenTyp, setSelectedMassnahmenTyp] = useState<string>('')
  const [cardOverrides, setCardOverrides] = useState<Record<string, string>>({})
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [feedbackFilter, setFeedbackFilter] = useState<OutcomeKey | 'Alle'>('Alle')

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }, [])

  const prioritized = [...customers].sort((a, b) => b.prioScore - a.prioScore).slice(0, 20)
    .filter(c => segmentFilter === 'Alle' || c.segment === segmentFilter)

  async function loadAiRecommendation(c: Customer, overrideTyp?: string) {
    setSelected(c); setAiText(''); setAiError(''); setAiLoading(true)
    const massnahmenTyp = overrideTyp ?? cardOverrides[c.id] ?? c.massnahmenTyp
    setSelectedMassnahmenTyp(massnahmenTyp)
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: c.segment, clvTier: c.clvTier, lieblingssorte: c.lieblingssorte,
          recencyDays: c.recencyDays, orderCount: c.orderCount,
          totalRevenue: Math.round(c.totalRevenue), massnahmenTyp,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiText(data.recommendation)
    } catch {
      setAiError('KI-Empfehlung konnte nicht geladen werden. Prüfe ANTHROPIC_API_KEY in .env.local.')
    } finally {
      setAiLoading(false)
    }
  }

  function handleChipClick(chip: { label: string; value: string }) {
    if (!selected) return
    setSelectedMassnahmenTyp(chip.value)
    loadAiRecommendation(selected, chip.value)
  }

  function handleCardOverride(customerId: string, newTyp: string, e: React.MouseEvent) {
    e.stopPropagation()
    setCardOverrides(prev => ({ ...prev, [customerId]: newTyp }))
    if (selected?.id === customerId) {
      const c = customers.find(x => x.id === customerId)
      if (c) loadAiRecommendation(c, newTyp)
    }
  }

  function markAsSent(c: Customer) {
    const existing = actions.find(a => a.customerId === c.id && a.outcome === 'ausstehend')
    if (existing) return
    const massnahmenTyp = selectedMassnahmenTyp || cardOverrides[c.id] || c.massnahmenTyp
    const newAction: MarketingAction = {
      id: `${c.id}_${Date.now()}`, customerId: c.id, customerName: `${c.vorname} ${c.nachname}`,
      massnahmenTyp, segment: c.segment, clvTier: c.clvTier,
      sentAt: new Date().toISOString(), outcome: 'ausstehend',
    }
    setActions([...actions, newAction])
    showToast(`${c.vorname} ${c.nachname} als gesendet markiert`)
  }

  function updateOutcome(id: string, outcome: OutcomeKey) {
    setActions(actions.map(a => a.id === id ? { ...a, outcome } : a))
  }

  function bulkSetOutcome(outcome: OutcomeKey) {
    setActions(actions.map(a => a.outcome === 'ausstehend' ? { ...a, outcome } : a))
  }

  function copyToClipboard() {
    if (aiText) navigator.clipboard.writeText(aiText).then(() => showToast('Text kopiert!'))
  }

  if (customers.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-[#8B6070]"><div className="text-5xl mb-4 opacity-30">📣</div><p>Bitte zuerst eine CSV-Datei importieren.</p></div>
      </div>
    )
  }

  const feedbackFiltered = feedbackFilter === 'Alle' ? actions : actions.filter(a => a.outcome === feedbackFilter)
  const totalSent = actions.length
  const totalPositiv = actions.filter(a => a.outcome === 'positiv').length
  const totalNegativ = actions.filter(a => a.outcome === 'negativ').length
  const totalAusstehend = actions.filter(a => a.outcome === 'ausstehend').length
  const successRate = totalSent > 0 ? Math.round((totalPositiv / totalSent) * 100) : 0

  const segPerf: Record<string, { pos: number; total: number }> = {}
  for (const a of actions) {
    if (!segPerf[a.segment]) segPerf[a.segment] = { pos: 0, total: 0 }
    segPerf[a.segment].total++
    if (a.outcome === 'positiv') segPerf[a.segment].pos++
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toast message={toastMessage} visible={toastVisible} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1C0A0F]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Marketing-Workflow</h1>
        <p className="text-sm text-[#8B6070] mt-1">KI-gestützte Maßnahmen · Feedback-Loop · Tracking</p>
      </div>

      <div className="flex gap-1 mb-6 bg-[#F0EDE6] p-1 rounded-xl w-fit">
        {[{ key: 'workflow', label: 'Workflow', icon: <Sparkles size={14} /> }, { key: 'feedback', label: 'Feedback-Loop', icon: <TrendingUp size={14} /> }].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
            style={activeTab === key ? { background: 'white', color: '#6B2737', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#8B6070' }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {activeTab === 'workflow' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1C0A0F]">Top 20 Prioritäten{segmentFilter !== 'Alle' && <span className="ml-2 text-xs font-normal text-[#8B6070]">({prioritized.length} angezeigt)</span>}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(['Alle', ...ALL_SEGMENTS] as (Segment | 'Alle')[]).map(seg => {
                const isActive = segmentFilter === seg
                return (
                  <button key={seg} onClick={() => setSegmentFilter(seg)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all border"
                    style={seg === 'Alle'
                      ? { background: isActive ? '#6B2737' : 'white', color: isActive ? 'white' : '#6B2737', borderColor: '#6B2737' }
                      : { background: isActive ? SEGMENT_COLORS[seg] : 'white', color: isActive ? SEGMENT_TEXT_COLORS[seg] : '#8B6070', borderColor: isActive ? SEGMENT_COLORS[seg] : '#E8D5C0' }}>
                    {seg === 'Alle' ? <span className="flex items-center gap-1"><Filter size={10} /> Alle</span> : seg}
                  </button>
                )
              })}
            </div>
            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {prioritized.length === 0 && (
                <div className="bg-white rounded-xl border p-6 text-center text-sm text-[#8B6070]" style={{ borderColor: '#E8D5C0' }}>Kein Kunde in diesem Segment gefunden.</div>
              )}
              {prioritized.map((c, index) => {
                const alreadySent = actions.some(a => a.customerId === c.id)
                const prioColor = c.prioScore >= 100 ? '#c0392b' : c.prioScore >= 70 ? '#e67e22' : '#27ae60'
                const segColor = SEGMENT_COLORS[c.segment] ?? '#eee'
                const isSelected = selected?.id === c.id
                const override = cardOverrides[c.id]
                const displayTyp = override ?? c.massnahmenTyp
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    className="bg-white rounded-xl border cursor-pointer overflow-hidden"
                    style={{ borderColor: isSelected ? '#C9A84C' : '#E8D5C0', borderWidth: isSelected ? 2 : 1, opacity: alreadySent ? 0.6 : 1, boxShadow: isSelected ? '0 0 0 2px #C9A84C40' : undefined }}
                    whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: { duration: 0.15 } }}
                    onClick={() => loadAiRecommendation(c)}>
                    <div className="h-1 w-full" style={{ background: segColor }} />
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-semibold text-sm text-[#1C0A0F]">{c.vorname} {c.nachname}</span>
                            {alreadySent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">✓ Gesendet</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: segColor, color: SEGMENT_TEXT_COLORS[c.segment] }}>{c.segment}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F5F0F3] text-[#6B4A55] font-mono">R:{c.rScore} F:{c.fScore} M:{c.mScore}</span>
                          </div>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <select value={displayTyp}
                              onChange={e => { const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent; handleCardOverride(c.id, e.target.value, fakeEvent) }}
                              className="text-[11px] px-2 py-0.5 rounded-md border cursor-pointer max-w-[180px] truncate"
                              style={{ borderColor: '#E8D5C0', color: '#6B4A55', background: '#FDF9F5' }}>
                              {MASSNAHMEN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown size={10} className="text-[#8B6070] -ml-1 pointer-events-none" />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold" style={{ color: '#C9A84C' }}>{c.prioScore}</div>
                          <div className="text-[10px] text-[#8B6070] leading-tight">Prio</div>
                          <div className="text-xs text-[#8B6070] mt-1">{fmt(c.clv)}</div>
                        </div>
                      </div>
                      {c.risikoSignal !== 'Keins' && (
                        <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: c.risikoSignal === 'Akut gefährdet' ? '#c0392b' : '#e67e22' }}>
                          <AlertTriangle size={11} /> {c.risikoSignal}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="sticky top-6">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}
                  className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
                  <div className="px-5 py-4 border-b" style={{ background: 'linear-gradient(135deg, #1C0A0F, #4A1825)', borderColor: '#E8D5C0' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><Sparkles size={15} className="text-yellow-400" /><span className="text-sm font-semibold text-white">{selected.vorname} {selected.nachname}</span></div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: SEGMENT_COLORS[selected.segment], color: SEGMENT_TEXT_COLORS[selected.segment] }}>{selected.segment}</span>
                          <span className="text-xs text-white/60">Prio <span style={{ color: '#C9A84C', fontWeight: 700 }}>{selected.prioScore}</span></span>
                          <span className="text-xs text-white/50">· {fmt(selected.clv)} CLV</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pt-4 pb-2">
                    <p className="text-xs text-[#8B6070] mb-2 font-medium">Maßnahmen-Typ:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MASSNAHMEN_CHIPS.map(chip => {
                        const isActive = (selectedMassnahmenTyp || selected.massnahmenTyp) === chip.value
                        return (
                          <button key={chip.value} onClick={() => handleChipClick(chip)}
                            className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all border"
                            style={{ background: isActive ? '#6B2737' : 'white', color: isActive ? 'white' : '#6B2737', borderColor: '#6B2737' }}>
                            {chip.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    {aiLoading ? (
                      <div className="flex flex-col items-center gap-3 py-10 justify-center text-[#8B6070]">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: '#6B2737', borderTopColor: 'transparent' }} />
                          <div className="absolute inset-2 rounded-full border-2 animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', animationDirection: 'reverse', animationDuration: '0.6s' }} />
                        </div>
                        <span className="text-sm text-[#8B6070]">KI denkt nach…</span>
                      </div>
                    ) : aiError ? (
                      <div className="mt-3">
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-3">{aiError}</div>
                        <button onClick={() => loadAiRecommendation(selected)}
                          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border cursor-pointer" style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                          <RefreshCw size={13} /> Erneut versuchen
                        </button>
                      </div>
                    ) : aiText ? (
                      <div className="mt-3">
                        <div className="text-sm leading-relaxed text-[#1C0A0F] p-4 rounded-xl mb-4"
                          style={{ background: '#FAF7F2', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontSize: '12.5px', lineHeight: '1.75' }}>
                          <TypewriterText text={aiText} />
                        </div>
                        {selected.empfohleneWeine && selected.empfohleneWeine.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-[#8B6070] mb-2 uppercase tracking-wide">Empfohlene Weine</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selected.empfohleneWeine.map(w => (
                                <span key={w.id} title={w.reason} className="text-xs px-2.5 py-1 rounded-full border font-medium" style={{ borderColor: '#C9A84C', color: '#7a5800', background: '#FFFAEE' }}>🍷 {w.name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-4" style={{ background: '#F5F0FA', border: '1px solid #E0D5F0' }}>
                          <BarChart2 size={14} style={{ color: '#6B2737', flexShrink: 0 }} />
                          <span className="text-xs text-[#6B4A55]">Ø Erfolgsrate für <span className="font-semibold" style={{ color: '#6B2737' }}>{selectedMassnahmenTyp || selected.massnahmenTyp}</span>{': '}<span className="font-bold" style={{ color: '#27ae60' }}>{MASSNAHMEN_SUCCESS_RATES[selectedMassnahmenTyp || selected.massnahmenTyp] ?? 65}%</span></span>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      {aiText && (
                        <button onClick={copyToClipboard} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium cursor-pointer border transition-all hover:shadow-sm" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                          <Copy size={13} /> Kopieren
                        </button>
                      )}
                      <button onClick={() => loadAiRecommendation(selected)} className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium cursor-pointer border" style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                        <Sparkles size={14} /> Neu generieren
                      </button>
                      <button onClick={() => markAsSent(selected)}
                        disabled={actions.some(a => a.customerId === selected.id && a.outcome === 'ausstehend')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)', color: 'white' }}>
                        <Send size={14} /> Als gesendet markieren
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: '#E8D5C0' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #F5EEF2, #FAF7F2)' }}>
                    <Sparkles size={28} style={{ color: '#C9A84C', opacity: 0.7 }} />
                  </div>
                  <h3 className="text-base font-semibold text-[#1C0A0F] mb-2">KI-Analyse starten</h3>
                  <p className="text-sm text-[#8B6070] mb-4 leading-relaxed">Klicke einen Kunden in der Prioritätsliste an,<br />um eine personalisierte KI-Empfehlung zu erhalten.</p>
                  <div className="text-left inline-block text-xs text-[#8B6070] space-y-1.5">
                    {['1. Segment-Filter nutzen um zu fokussieren','2. Kunden anklicken → KI analysiert automatisch','3. Maßnahmen-Typ per Chip ändern','4. Text kopieren oder als gesendet markieren'].map((step, i) => (
                      <div key={i} className="flex items-start gap-2"><span style={{ color: '#C9A84C', fontWeight: 700 }}>→</span><span>{step}</span></div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Gesendet', value: totalSent, color: '#6B2737', bg: '#FDF0F3', icon: <Send size={14} /> },
              { label: 'Positiv', value: totalPositiv, color: '#27ae60', bg: '#E8F8F1', icon: <CheckCircle size={14} /> },
              { label: 'Negativ', value: totalNegativ, color: '#c0392b', bg: '#FDECEA', icon: <XCircle size={14} /> },
              { label: 'Ausstehend', value: totalAusstehend, color: '#e67e22', bg: '#FEF3E2', icon: <Clock size={14} /> },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="rounded-xl p-4 border shadow-sm" style={{ background: bg, borderColor: `${color}30` }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ color }}>{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
                <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {actions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-5 shadow-sm" style={{ borderColor: '#E8D5C0' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#1C0A0F]">Gesamt-Erfolgsrate</span>
                  <span className="text-2xl font-bold" style={{ color: successRate >= 60 ? '#27ae60' : successRate >= 40 ? '#e67e22' : '#c0392b' }}>{successRate}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F0EDE6] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${successRate}%`, background: successRate >= 60 ? '#27ae60' : successRate >= 40 ? '#e67e22' : '#c0392b' }} />
                </div>
                <p className="text-xs text-[#8B6070] mt-2">{totalPositiv} von {totalSent} Maßnahmen erfolgreich</p>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm" style={{ borderColor: '#E8D5C0' }}>
                <p className="text-sm font-semibold text-[#1C0A0F] mb-3">Segment-Performance</p>
                {Object.keys(segPerf).length === 0 ? <p className="text-xs text-[#8B6070]">Noch keine Daten vorhanden.</p> : (
                  <div className="space-y-1.5">
                    {Object.entries(segPerf).sort((a, b) => (b[1].pos/Math.max(b[1].total,1)) - (a[1].pos/Math.max(a[1].total,1))).map(([seg, { pos, total }]) => {
                      const rate = total > 0 ? Math.round((pos/total)*100) : 0
                      return (
                        <div key={seg} className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: SEGMENT_COLORS[seg]??'#eee', color: SEGMENT_TEXT_COLORS[seg]??'#333' }}>{seg}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#F0EDE6] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${rate}%`, background: '#27ae60' }} /></div>
                          <span className="text-xs font-semibold text-[#1C0A0F] w-8 text-right">{rate}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {actions.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: '#E8D5C0' }}>
              <div className="text-4xl mb-3 opacity-30">📊</div>
              <p className="text-sm text-[#8B6070]">Noch keine Maßnahmen gesendet.<br />Gehe zu „Workflow“ und markiere Maßnahmen als gesendet.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex gap-1.5">
                  {(['Alle','positiv','negativ','ausstehend','keine_reaktion'] as (OutcomeKey|'Alle')[]).map(f => {
                    const isActive = feedbackFilter === f
                    const meta = f !== 'Alle' ? OUTCOME_LABELS[f] : null
                    return (
                      <button key={f} onClick={() => setFeedbackFilter(f)}
                        className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all border"
                        style={{ background: isActive ? (meta?.color??'#6B2737') : 'white', color: isActive ? 'white' : (meta?.color??'#6B2737'), borderColor: meta?.color??'#6B2737' }}>
                        {f === 'Alle' ? 'Alle' : meta?.label}
                      </button>
                    )
                  })}
                </div>
                {totalAusstehend > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => bulkSetOutcome('positiv')} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#27ae60', color: '#27ae60' }}>Alle ausstehend → Positiv</button>
                    <button onClick={() => bulkSetOutcome('keine_reaktion')} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#8B6070', color: '#8B6070' }}>Alle → Keine Reaktion</button>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: '#E8D5C0' }}>
                <table className="w-full text-sm">
                  <thead><tr style={{ background: '#F8F3ED' }}>{['Kunde','Segment','Maßnahme','CLV','Gesendet am','Outcome'].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8B6070]">{h}</th>))}</tr></thead>
                  <tbody>
                    {feedbackFiltered.map(a => (
                      <tr key={a.id} className="border-t hover:bg-[#FFF8F3]" style={{ borderColor: '#F0E8DC' }}>
                        <td className="px-4 py-3 font-medium text-[#1C0A0F]">{a.customerName}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: SEGMENT_COLORS[a.segment], color: SEGMENT_TEXT_COLORS[a.segment] }}>{a.segment}</span></td>
                        <td className="px-4 py-3 text-[#6B4A50] text-xs">{a.massnahmenTyp}</td>
                        <td className="px-4 py-3 text-xs text-white font-bold"><span className="px-2 py-0.5 rounded-full" style={{ background: a.clvTier==='A'?'#6B2737':a.clvTier==='B'?'#C9A84C':'#ccc', color: a.clvTier==='C'?'#555':'white' }}>{a.clvTier}</span></td>
                        <td className="px-4 py-3 text-xs text-[#8B6070]">{new Date(a.sentAt).toLocaleDateString('de-DE')}</td>
                        <td className="px-4 py-3">
                          <select value={a.outcome} onChange={e => updateOutcome(a.id, e.target.value as OutcomeKey)}
                            className="text-xs px-2 py-1 rounded-lg border cursor-pointer" style={{ borderColor: '#E8D5C0', color: OUTCOME_LABELS[a.outcome as OutcomeKey]?.color }}>
                            {(Object.entries(OUTCOME_LABELS) as [OutcomeKey, typeof OUTCOME_LABELS[OutcomeKey]][]).map(([key, { label }]) => (<option key={key} value={key}>{label}</option>))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
