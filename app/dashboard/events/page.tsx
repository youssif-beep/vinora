'use client'

import { useState } from 'react'
import { useVinora } from '@/lib/store'
import { locationMatch, evTypColor, initAutoEvents } from '@/lib/events'
import { fmt, SEGMENT_COLORS, SEGMENT_TEXT_COLORS } from '@/lib/rfm'
import type { VinoraSavedEvent } from '@/types/customer'
import { Plus, Trash2, CalendarDays, MapPin } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const EVENT_TYPES = ['Weinfest','Hochzeit-Saison','Stadtfest / Volksfest','Restaurant-Eröffnung','Firmen-Event','Sonstiges']

export default function EventsPage() {
  const { customers, events, setEvents } = useVinora()
  const [name, setName] = useState('')
  const [datum, setDatum] = useState('')
  const [ort, setOrt] = useState('')
  const [typ, setTyp] = useState('')
  const [notiz, setNotiz] = useState('')

  const sorted = [...events].sort((a, b) => a.datum.localeCompare(b.datum))

  function addEvent(e: React.FormEvent) {
    e.preventDefault()
    const ev: VinoraSavedEvent = { id: Date.now().toString(), name, datum, ort, typ, notiz }
    setEvents([...events, ev])
    setName(''); setDatum(''); setOrt(''); setTyp(''); setNotiz('')
  }

  function deleteEvent(id: string) {
    setEvents(events.filter(e => e.id !== id))
  }

  function resetToAuto() {
    if (!confirm('Alle Events löschen und Auto-Events neu laden?')) return
    const regions = customers.map(c => c.wohnort).filter(Boolean)
    setEvents(initAutoEvents([], regions))
  }

  const byMonth: Record<number, VinoraSavedEvent[]> = {}
  for (let i = 1; i <= 12; i++) byMonth[i] = []
  sorted.forEach(ev => {
    const m = parseInt((ev.datum || '').split('-')[1])
    if (byMonth[m]) byMonth[m].push(ev)
  })

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none" as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1C0A0F]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
          Eventkalender
        </h1>
        <p className="text-sm text-[#8B6070] mt-1">{events.length} Events · Automatisches Kunden-Matching</p>
      </div>

      {/* Calendar strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
        {MONTHS.map((m, i) => {
          const evs = byMonth[i + 1]
          return (
            <div key={m} className="min-w-[90px] bg-white rounded-xl border p-3 text-center flex-shrink-0" style={{ borderColor: '#E8D5C0' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#6B2737' }}>{m}</div>
              <div className="flex flex-wrap gap-1 justify-center min-h-[20px] mb-1">
                {evs.map(ev => (
                  <div key={ev.id} className="w-2.5 h-2.5 rounded-full" style={{ background: evTypColor(ev.typ) }} title={ev.name} />
                ))}
              </div>
              <div className="text-[10px] text-[#8B6070]">{evs.length > 0 ? `${evs.length} Event${evs.length > 1 ? 's' : ''}` : ''}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-[#1C0A0F]">Alle Events</h2>
            <button onClick={resetToAuto} className="text-xs text-[#8B6070] hover:text-[#6B2737] cursor-pointer">↺ Auto-Events neu laden</button>
          </div>
          {sorted.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-[#8B6070]" style={{ borderColor: '#E8D5C0' }}>
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Events. Füge rechts einen hinzu.</p>
            </div>
          ) : sorted.map(ev => {
            const matchCs = customers.filter(c => locationMatch(ev.ort, c.wohnort)).sort((a, b) => b.prioScore - a.prioScore)
            return (
              <div key={ev.id} className="bg-white rounded-xl border p-4" style={{ borderColor: '#E8D5C0' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: evTypColor(ev.typ) }}>
                        {ev.typ}
                      </span>
                      <span className="font-semibold text-sm text-[#1C0A0F]">{ev.name}</span>
                      {ev.auto && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Auto</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#8B6070]">
                      <span>📅 {ev.datum.split('-').reverse().join('.')}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} />{ev.ort}</span>
                    </div>
                    {ev.notiz && <div className="text-xs text-[#8B6070] italic mt-1">{ev.notiz}</div>}
                    {matchCs.length > 0 ? (
                      <div className="mt-2 p-2 rounded-lg bg-green-50 border border-green-200">
                        <div className="text-xs font-semibold text-green-800 mb-1">{matchCs.length} passende Kunden in der Region</div>
                        <div className="flex flex-wrap gap-1.5">
                          {matchCs.slice(0, 5).map(c => (
                            <div key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-green-200 text-green-800 flex items-center gap-1">
                              {c.vorname} {c.nachname}
                              <span className="font-bold" style={{ color: c.clvTier === 'A' ? '#6B2737' : c.clvTier === 'B' ? '#C9A84C' : '#888' }}>{c.clvTier}</span>
                            </div>
                          ))}
                          {matchCs.length > 5 && <span className="text-xs text-green-700">+{matchCs.length - 5} weitere</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-[#8B6070] italic">
                        {customers.length > 0 ? 'Keine Kunden in dieser Region.' : 'CSV laden für Kunden-Matching.'}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-[#8B6070] hover:text-red-600 cursor-pointer flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add Event Form */}
        <div>
          <h2 className="text-sm font-semibold text-[#1C0A0F] mb-3">Event hinzufügen</h2>
          <form onSubmit={addEvent} className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: '#E8D5C0' }}>
            <div>
              <label className="text-xs text-[#8B6070] mb-1 block">Event-Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Weinfest Stuttgart"
                className={inputCls} style={{ borderColor: '#E8D5C0' }} />
            </div>
            <div>
              <label className="text-xs text-[#8B6070] mb-1 block">Datum *</label>
              <input required type="date" value={datum} onChange={e => setDatum(e.target.value)} min="2026-01-01" max="2026-12-31"
                className={inputCls} style={{ borderColor: '#E8D5C0' }} />
            </div>
            <div>
              <label className="text-xs text-[#8B6070] mb-1 block">Ort / Region *</label>
              <input required value={ort} onChange={e => setOrt(e.target.value)} placeholder="z.B. Stuttgart"
                className={inputCls} style={{ borderColor: '#E8D5C0' }} />
            </div>
            <div>
              <label className="text-xs text-[#8B6070] mb-1 block">Typ *</label>
              <select required value={typ} onChange={e => setTyp(e.target.value)}
                className={inputCls + ' cursor-pointer'} style={{ borderColor: '#E8D5C0' }}>
                <option value="">Bitte wählen…</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8B6070] mb-1 block">Notiz (optional)</label>
              <textarea value={notiz} onChange={e => setNotiz(e.target.value)} placeholder="Anmerkungen…" rows={3}
                className={inputCls + ' resize-none'} style={{ borderColor: '#E8D5C0' }} />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)' }}>
              <Plus size={15} /> Event speichern
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
