'use client'

import { useMemo, useState } from 'react'
import { useVinora } from '@/lib/store'
import { fmt, fmtDate, SEGMENT_COLORS, SEGMENT_TEXT_COLORS } from '@/lib/rfm'
import { buildMessage, ALL_ACTION_TYPES } from '@/lib/messages'
import { locationMatch } from '@/lib/events'
import type { Customer, MarketingAction, Campaign, Segment } from '@/types/customer'
import { Phone, Users, Copy, Download, CheckCircle2, Circle, Megaphone } from 'lucide-react'

const ALL_SEGMENTS: Segment[] = ['Top-Kunde', 'Loyal', 'Gefährdet', 'Eingeschlafen', 'Neukunde/Selten', 'Wachsend']

/** IDs werden außerhalb des Renders erzeugt – im Render wäre Date.now() nicht zulässig. */
function neueActionId(customerId: string): string {
  return `${customerId}_${Date.now()}`
}

/** Maßnahmen, die am Telefon stattfinden – daraus wird die Anrufliste. */
function istAnruf(typ: string): boolean {
  return typ.toLowerCase().includes('anruf')
}

export function KampagnenPanel({ onToast }: { onToast: (msg: string) => void }) {
  const { customers, actions, setActions, campaigns, setCampaigns, events, settings, templatesA, templatesB } = useVinora()
  const [modus, setModus] = useState<'sammelaktion' | 'anrufliste'>('sammelaktion')
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'Alle'>('Gefährdet')
  const [nurRisiko, setNurRisiko] = useState(false)
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(new Set())
  const [massnahmenTyp, setMassnahmenTyp] = useState<string>(ALL_ACTION_TYPES[0])
  const [kampagnenName, setKampagnenName] = useState('')

  const offeneKundenIds = useMemo(
    () => new Set(actions.filter(a => a.outcome === 'ausstehend').map(a => a.customerId)),
    [actions],
  )

  const kandidaten = useMemo(() => {
    return customers
      .filter(c => segmentFilter === 'Alle' || c.segment === segmentFilter)
      .filter(c => !nurRisiko || c.risikoSignal !== 'Keins')
      .sort((a, b) => b.prioScore - a.prioScore)
  }, [customers, segmentFilter, nurRisiko])

  const anrufliste = useMemo(() => {
    return customers
      .filter(c => istAnruf(c.massnahmenTyp))
      .filter(c => !actions.some(a => a.customerId === c.id && a.outcome !== 'ausstehend'))
      .sort((a, b) => b.prioScore - a.prioScore)
  }, [customers, actions])

  function toggle(id: string) {
    setAusgewaehlt(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function alleUmschalten() {
    setAusgewaehlt(prev => (prev.size === kandidaten.length ? new Set() : new Set(kandidaten.map(c => c.id))))
  }

  function textFuer(c: Customer, typ?: string): string {
    const passendeEvents = events.filter(e => locationMatch(e.ort, c.wohnort))
    const kunde = typ ? { ...c, massnahmenTyp: typ } : c
    return buildMessage(kunde, passendeEvents, templatesA, templatesB, settings.abTestingEnabled)
  }

  function kampagneAnlegen() {
    const ids = [...ausgewaehlt]
    if (ids.length === 0) return
    const jetzt = new Date()
    const name = kampagnenName.trim() || `${massnahmenTyp} · ${jetzt.toLocaleDateString('de-DE')}`
    const campaign: Campaign = {
      id: `camp_${jetzt.getTime()}`,
      name,
      massnahmenTyp,
      createdAt: jetzt.toISOString(),
      customerIds: ids,
    }
    const neueActions: MarketingAction[] = ids.map(id => {
      const c = customers.find(x => x.id === id)!
      return {
        id: `${id}_${jetzt.getTime()}`,
        customerId: id,
        customerName: `${c.vorname} ${c.nachname}`,
        massnahmenTyp,
        segment: c.segment,
        clvTier: c.clvTier,
        sentAt: jetzt.toISOString(),
        outcome: 'ausstehend',
        abGroup: c.abGroup,
        campaignId: campaign.id,
        revenueBefore: c.totalRevenue,
      }
    })
    setCampaigns([...campaigns, campaign])
    setActions([...actions, ...neueActions])
    setAusgewaehlt(new Set())
    setKampagnenName('')
    onToast(`Kampagne „${name}" mit ${ids.length} Kunden angelegt`)
  }

  function alleTexteKopieren() {
    const text = [...ausgewaehlt]
      .map(id => customers.find(c => c.id === id)!)
      .map(c => `--- ${c.vorname} ${c.nachname} <${c.email || 'keine E-Mail'}> ---\n${textFuer(c, massnahmenTyp)}`)
      .join('\n\n')
    navigator.clipboard.writeText(text).then(() => onToast(`${ausgewaehlt.size} Texte kopiert`))
  }

  /** Übergabe an das Werkzeug, mit dem das Weingut tatsächlich verschickt. */
  function csvExportieren() {
    const rows = [...ausgewaehlt].map(id => customers.find(c => c.id === id)!)
    const kopf = ['Vorname', 'Nachname', 'Email', 'Segment', 'Massnahme', 'Variante', 'Text']
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
    const csv = [
      kopf.join(';'),
      ...rows.map(c => [
        c.vorname, c.nachname, c.email, c.segment, massnahmenTyp,
        settings.abTestingEnabled ? c.abGroup : '–', textFuer(c, massnahmenTyp),
      ].map(v => escape(String(v))).join(';')),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `vinora_kampagne_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    onToast(`${rows.length} Kunden exportiert`)
  }

  function anrufErledigt(c: Customer, ergebnis: 'positiv' | 'negativ' | 'keine_reaktion') {
    const offen = actions.find(a => a.customerId === c.id && a.outcome === 'ausstehend')
    if (offen) {
      setActions(actions.map(a => (a.id === offen.id ? { ...a, outcome: ergebnis } : a)))
    } else {
      setActions([...actions, {
        id: neueActionId(c.id),
        customerId: c.id,
        customerName: `${c.vorname} ${c.nachname}`,
        massnahmenTyp: c.massnahmenTyp,
        segment: c.segment,
        clvTier: c.clvTier,
        sentAt: new Date().toISOString(),
        outcome: ergebnis,
        abGroup: c.abGroup,
        revenueBefore: c.totalRevenue,
      }])
    }
    onToast(`${c.vorname} ${c.nachname} abgehakt`)
  }

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-[#F0EDE6] p-1 rounded-xl w-fit">
        {[
          { key: 'sammelaktion', label: 'Sammelaktion', icon: <Users size={14} /> },
          { key: 'anrufliste', label: `Anrufliste (${anrufliste.length})`, icon: <Phone size={14} /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setModus(key as typeof modus)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
            style={modus === key ? { background: 'white', color: '#6B2737', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#8B6070' }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {modus === 'sammelaktion' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {(['Alle', ...ALL_SEGMENTS] as (Segment | 'Alle')[]).map(seg => {
                const aktiv = segmentFilter === seg
                return (
                  <button key={seg} onClick={() => setSegmentFilter(seg)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer border transition-all"
                    style={seg === 'Alle'
                      ? { background: aktiv ? '#6B2737' : 'white', color: aktiv ? 'white' : '#6B2737', borderColor: '#6B2737' }
                      : { background: aktiv ? SEGMENT_COLORS[seg] : 'white', color: aktiv ? SEGMENT_TEXT_COLORS[seg] : '#8B6070', borderColor: aktiv ? SEGMENT_COLORS[seg] : '#E8D5C0' }}>
                    {seg}
                  </button>
                )
              })}
              <label className="flex items-center gap-1.5 text-xs text-[#6B4A55] ml-2 cursor-pointer">
                <input type="checkbox" checked={nurRisiko} onChange={e => setNurRisiko(e.target.checked)} />
                nur mit Risikosignal
              </label>
            </div>

            <div className="flex items-center justify-between mb-2">
              <button onClick={alleUmschalten} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                {ausgewaehlt.size === kandidaten.length && kandidaten.length > 0 ? 'Auswahl aufheben' : `Alle ${kandidaten.length} auswählen`}
              </button>
              <span className="text-xs text-[#8B6070]">{ausgewaehlt.size} ausgewählt</span>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
              <div className="max-h-[60vh] overflow-y-auto">
                {kandidaten.length === 0 && <p className="p-6 text-center text-sm text-[#8B6070]">Kein Kunde in dieser Auswahl.</p>}
                {kandidaten.map(c => {
                  const gewaehlt = ausgewaehlt.has(c.id)
                  const offen = offeneKundenIds.has(c.id)
                  return (
                    <button key={c.id} onClick={() => toggle(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 border-t text-left cursor-pointer hover:bg-[#FFF8F3]"
                      style={{ borderColor: '#F0E8DC', background: gewaehlt ? '#FDF6F0' : undefined }}>
                      {gewaehlt ? <CheckCircle2 size={16} style={{ color: '#6B2737' }} /> : <Circle size={16} style={{ color: '#D8C8BE' }} />}
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#1C0A0F]">{c.vorname} {c.nachname}</span>
                        {!c.email && <span className="ml-2 text-[10px] text-[#c0392b]">keine E-Mail</span>}
                        {offen && <span className="ml-2 text-[10px] text-[#e67e22]">Maßnahme offen</span>}
                        <span className="block text-[11px] text-[#8B6070]">{c.wohnort} · {c.lieblingssorte}</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: SEGMENT_COLORS[c.segment], color: SEGMENT_TEXT_COLORS[c.segment] }}>{c.segment}</span>
                      <span className="text-xs text-[#8B6070] w-20 text-right flex-shrink-0">{fmt(c.clvPrognose ?? c.clv)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E8D5C0' }}>
              <p className="text-sm font-semibold text-[#1C0A0F] mb-3 flex items-center gap-2"><Megaphone size={15} style={{ color: '#6B2737' }} /> Sammelaktion anlegen</p>
              <label className="block text-xs text-[#8B6070] mb-1">Name</label>
              <input value={kampagnenName} onChange={e => setKampagnenName(e.target.value)} placeholder="z. B. Herbstaktion Gefährdete"
                className="w-full text-sm px-3 py-2 rounded-lg border mb-3" style={{ borderColor: '#E8D5C0' }} />
              <label className="block text-xs text-[#8B6070] mb-1">Maßnahme</label>
              <select value={massnahmenTyp} onChange={e => setMassnahmenTyp(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border mb-4 cursor-pointer" style={{ borderColor: '#E8D5C0' }}>
                {ALL_ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <div className="space-y-2">
                <button onClick={alleTexteKopieren} disabled={ausgewaehlt.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: '#C9A84C', color: '#8a6d1f' }}>
                  <Copy size={14} /> Alle Texte kopieren
                </button>
                <button onClick={csvExportieren} disabled={ausgewaehlt.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                  <Download size={14} /> Als CSV exportieren
                </button>
                <button onClick={kampagneAnlegen} disabled={ausgewaehlt.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #6B2737, #8B3348)', color: 'white' }}>
                  <CheckCircle2 size={14} /> {ausgewaehlt.size} als versendet erfassen
                </button>
              </div>
              <p className="text-[11px] text-[#8B6070] mt-3 leading-relaxed">
                Versendet wird außerhalb von Vinora. Erfasst wird hier, was rausging – damit die Auswertung später weiß, worauf sie sich bezieht.
              </p>
            </div>

            {campaigns.length > 0 && (
              <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E8D5C0' }}>
                <p className="text-sm font-semibold text-[#1C0A0F] mb-2">Bisherige Sammelaktionen</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {[...campaigns].reverse().map(k => (
                    <div key={k.id} className="text-xs border-b pb-1.5" style={{ borderColor: '#F0E8DC' }}>
                      <span className="font-medium text-[#1C0A0F]">{k.name}</span>
                      <span className="block text-[#8B6070]">{k.customerIds.length} Kunden · {fmtDate(k.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
          {anrufliste.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#8B6070]">Aktuell steht kein Anruf an.</p>
          ) : (
            anrufliste.map(c => (
              <div key={c.id} className="px-4 py-3 border-t flex items-start gap-4 flex-wrap" style={{ borderColor: '#F0E8DC' }}>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone size={14} style={{ color: '#c0392b' }} />
                    <span className="text-sm font-semibold text-[#1C0A0F]">{c.vorname} {c.nachname}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: SEGMENT_COLORS[c.segment], color: SEGMENT_TEXT_COLORS[c.segment] }}>{c.segment}</span>
                  </div>
                  <p className="text-xs text-[#8B6070]">
                    {c.wohnort} · Lieblingssorte {c.lieblingssorte} · zuletzt {fmtDate(c.lastOrder)}
                    {c.kaufintervallTage ? ` · kauft sonst alle ${Math.round(c.kaufintervallTage)} Tage` : ''}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6B2737' }}>
                    Wert in Gefahr: <strong>{fmt((c.churnRisiko ?? 0) * (c.clvPrognose ?? 0))}</strong> · Risiko {Math.round((c.churnRisiko ?? 0) * 100)} %
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => anrufErledigt(c, 'positiv')} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#27ae60', color: '#27ae60' }}>Erreicht · positiv</button>
                  <button onClick={() => anrufErledigt(c, 'negativ')} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#c0392b', color: '#c0392b' }}>Erreicht · negativ</button>
                  <button onClick={() => anrufErledigt(c, 'keine_reaktion')} className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: '#8B6070', color: '#8B6070' }}>Nicht erreicht</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
