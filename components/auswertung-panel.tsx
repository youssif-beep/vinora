'use client'

import { useMemo } from 'react'
import { useVinora } from '@/lib/store'
import { fmt, fmtDate } from '@/lib/rfm'
import { abAuswertung, massnahmenWirkung, reaktivierungen, wirkungGesamt, ATTRIBUTION_TAGE } from '@/lib/analytics'
import { TrendingUp, FlaskConical, Euro, RotateCcw, Info } from 'lucide-react'

function Balken({ anteil, farbe }: { anteil: number; farbe: string }) {
  return (
    <div className="h-2 rounded-full bg-[#F0EDE6] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, anteil * 100)}%`, background: farbe }} />
    </div>
  )
}

export function AuswertungPanel() {
  const { customers, actions } = useVinora()

  const ab = useMemo(() => abAuswertung(actions, customers), [actions, customers])
  const wirkung = useMemo(() => massnahmenWirkung(actions, customers), [actions, customers])
  const reakt = useMemo(() => reaktivierungen(actions, customers), [actions, customers])
  const gesamt = useMemo(() => wirkungGesamt(actions, customers), [actions, customers])

  if (actions.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: '#E8D5C0' }}>
        <div className="text-4xl mb-3 opacity-30">📈</div>
        <p className="text-sm text-[#8B6070]">
          Noch keine Maßnahmen erfasst.<br />
          Sobald Maßnahmen versendet und Rückmeldungen eingetragen sind, steht hier, was sie gebracht haben.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Gesamtbilanz */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Maßnahmen erfasst', wert: String(gesamt.gesendet), farbe: '#6B2737', bg: '#FDF0F3', icon: <TrendingUp size={14} /> },
          { label: 'Erfolgsquote', wert: gesamt.bewertet > 0 ? `${Math.round(gesamt.quote * 100)} %` : '–', farbe: '#27ae60', bg: '#E8F8F1', icon: <FlaskConical size={14} /> },
          { label: `Umsatz danach (${ATTRIBUTION_TAGE} Tage)`, wert: fmt(gesamt.umsatz), farbe: '#C9A84C', bg: '#FFFAEE', icon: <Euro size={14} /> },
          { label: 'Kunden zurückgeholt', wert: String(gesamt.reaktivierteKunden), farbe: '#8e44ad', bg: '#F5F0FA', icon: <RotateCcw size={14} /> },
        ].map(({ label, wert, farbe, bg, icon }) => (
          <div key={label} className="rounded-xl p-4 border shadow-sm" style={{ background: bg, borderColor: `${farbe}30` }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ color: farbe }}>{icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span></div>
            <div className="text-2xl font-bold" style={{ color: farbe }}>{wert}</div>
          </div>
        ))}
      </div>

      {gesamt.offen > 0 && (
        <div className="flex items-start gap-2 text-xs px-4 py-3 rounded-xl" style={{ background: '#FEF3E2', color: '#8a5a10' }}>
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>{gesamt.offen} Maßnahmen ohne Rückmeldung. Je mehr davon im Feedback-Loop eingetragen sind, desto belastbarer die Zahlen hier.</span>
        </div>
      )}

      {/* A/B-Bilanz */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#E8D5C0' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-[#1C0A0F] flex items-center gap-2"><FlaskConical size={15} style={{ color: '#6B2737' }} /> A/B-Test der Textvarianten</h3>
          {ab.gewinner && (
            <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: '#E8F8F1', color: '#1e7a45' }}>
              Variante {ab.gewinner} gewinnt
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[ab.a, ab.b].map(v => (
            <div key={v.gruppe} className="rounded-xl border p-4" style={{ borderColor: ab.gewinner === v.gruppe ? '#27ae60' : '#E8D5C0', borderWidth: ab.gewinner === v.gruppe ? 2 : 1 }}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold text-[#1C0A0F]">
                  Variante {v.gruppe}
                  <span className="ml-2 text-xs font-normal text-[#8B6070]">{v.gruppe === 'A' ? 'klassisch, respektvoll' : 'modern, direkt'}</span>
                </span>
                <span className="text-2xl font-bold" style={{ color: '#6B2737' }}>
                  {v.bewertet > 0 ? `${Math.round(v.quote * 100)} %` : '–'}
                </span>
              </div>
              <Balken anteil={v.quote} farbe={v.gruppe === 'A' ? '#3498db' : '#8e44ad'} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs text-[#8B6070]">
                <span>Versendet</span><span className="text-right font-medium text-[#1C0A0F]">{v.gesendet}</span>
                <span>Bewertet</span><span className="text-right font-medium text-[#1C0A0F]">{v.bewertet}</span>
                <span>Positiv</span><span className="text-right font-medium" style={{ color: '#27ae60' }}>{v.positiv}</span>
                <span>Umsatz danach</span><span className="text-right font-medium text-[#1C0A0F]">{fmt(v.umsatz)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs px-4 py-3 rounded-lg" style={{ background: '#FAF7F2', color: '#6B4A55' }}>
          {ab.hinweis}
          {ab.a.bewertet >= 10 && ab.b.bewertet >= 10 && (
            <span className="block mt-1">
              Unterschied: {ab.differenzPunkte > 0 ? '+' : ''}{ab.differenzPunkte.toFixed(1)} Prozentpunkte zugunsten von {ab.differenzPunkte >= 0 ? 'B' : 'A'}.
            </span>
          )}
        </div>
      </div>

      {/* Wirkung je Maßnahme */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#F0E8DC' }}>
          <h3 className="text-sm font-semibold text-[#1C0A0F]">Was welche Maßnahme gebracht hat</h3>
          <p className="text-xs text-[#8B6070] mt-0.5">Umsatz aus Bestellungen innerhalb von {ATTRIBUTION_TAGE} Tagen nach dem Versand</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F8F3ED' }}>
              {['Maßnahme', 'Versendet', 'Bewertet', 'Erfolgsquote', 'Umsatz danach', 'Ø je Maßnahme'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8B6070]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wirkung.map(w => (
              <tr key={w.massnahmenTyp} className="border-t" style={{ borderColor: '#F0E8DC' }}>
                <td className="px-4 py-2.5 text-[#1C0A0F]">{w.massnahmenTyp}</td>
                <td className="px-4 py-2.5 text-[#6B4A50]">{w.gesendet}</td>
                <td className="px-4 py-2.5 text-[#6B4A50]">{w.bewertet}</td>
                <td className="px-4 py-2.5">
                  {w.bewertet > 0
                    ? <span className="font-semibold" style={{ color: w.quote >= 0.6 ? '#27ae60' : w.quote >= 0.4 ? '#e67e22' : '#c0392b' }}>{Math.round(w.quote * 100)} %</span>
                    : <span className="text-[#8B6070]">–</span>}
                </td>
                <td className="px-4 py-2.5 font-medium text-[#1C0A0F]">{fmt(w.umsatz)}</td>
                <td className="px-4 py-2.5 text-[#6B4A50]">{fmt(w.umsatzProMassnahme)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reaktivierungen */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: '#F0E8DC' }}>
          <h3 className="text-sm font-semibold text-[#1C0A0F]">Kunden, die nach einer Maßnahme wieder bestellt haben</h3>
        </div>
        {reakt.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8B6070]">
            Noch keine Bestellung nach einer Maßnahme erfasst. Nach dem nächsten Datenimport steht hier, wer zurückgekommen ist.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F8F3ED' }}>
                {['Kunde', 'Maßnahme', 'Versendet', 'Bestellt nach', 'Umsatz'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8B6070]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reakt.map((r, i) => (
                <tr key={`${r.customerId}_${i}`} className="border-t" style={{ borderColor: '#F0E8DC' }}>
                  <td className="px-4 py-2.5 font-medium text-[#1C0A0F]">{r.customerName}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B4A50]">{r.massnahmenTyp}</td>
                  <td className="px-4 py-2.5 text-xs text-[#8B6070]">{fmtDate(r.sentAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B4A50]">{r.tageBisKauf} Tagen</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#27ae60' }}>{fmt(r.umsatz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
