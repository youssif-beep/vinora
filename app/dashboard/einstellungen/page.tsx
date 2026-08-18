'use client'

import { useState } from 'react'
import { useVinora, DEFAULT_SETTINGS } from '@/lib/store'
import type { RfmSettings } from '@/lib/store'
import { ALL_ACTION_TYPES } from '@/lib/messages'
import { RotateCcw, Save, FlaskConical, SlidersHorizontal, MessageSquare, ChevronDown, ChevronUp, Activity, TrendingUp, HardDriveDownload, HardDriveUpload, History } from 'lucide-react'
import { useRef } from 'react'
import { fmtDate } from '@/lib/rfm'

const SETTING_GROUPS = [
  {
    label: 'Segment-Schwellwerte (RFM-Score)',
    icon: <SlidersHorizontal size={15} />,
    items: [
      { key: 'topKundeMin', label: 'Top-Kunde ab Score', min: 1, max: 15, step: 1, desc: 'RFM-Score ≥ X → Top-Kunde' },
      { key: 'loyalMin', label: 'Loyal ab Score', min: 1, max: 15, step: 1, desc: 'RFM-Score ≥ X → Loyal (unterhalb Top-Kunde)' },
    ]
  },
  {
    label: 'CLV-Tier Grenzen (€)',
    icon: <SlidersHorizontal size={15} />,
    items: [
      { key: 'clvTierAMin', label: 'Tier A ab (€)', min: 1000, max: 50000, step: 500, desc: 'CLV ≥ X → Tier A (Goldkunde)' },
      { key: 'clvTierBMin', label: 'Tier B ab (€)', min: 500, max: 20000, step: 500, desc: 'CLV ≥ X → Tier B (Silber)' },
    ]
  },
  {
    label: 'Prio-Punkte (Maßnahmen-Ranking)',
    icon: <SlidersHorizontal size={15} />,
    items: [
      { key: 'prioGefaehrdet', label: 'Gefährdet', min: 0, max: 200, step: 5, desc: 'Basispunkte für gefährdete Kunden' },
      { key: 'prioTopKunde', label: 'Top-Kunde', min: 0, max: 200, step: 5, desc: 'Basispunkte für Top-Kunden' },
      { key: 'prioEingeschlafen', label: 'Eingeschlafen', min: 0, max: 200, step: 5, desc: 'Basispunkte für eingeschlafene Kunden' },
      { key: 'prioLoyal', label: 'Loyal', min: 0, max: 200, step: 5, desc: 'Basispunkte für loyale Kunden' },
      { key: 'prioRest', label: 'Rest (Neukunde/Wachsend)', min: 0, max: 200, step: 5, desc: 'Basispunkte für alle anderen' },
    ]
  },
  {
    label: 'Kaufrhythmus & Risiko',
    icon: <Activity size={15} />,
    items: [
      { key: 'fruehwarnFaktor', label: 'Frühwarnung ab dem …-fachen des eigenen Kaufintervalls', min: 1, max: 4, step: 0.1, desc: 'Kunde kauft sonst alle X Tage – ab dem Wievielfachen wird gewarnt' },
      { key: 'akutFaktor', label: 'Akut gefährdet ab dem …-fachen', min: 1.5, max: 6, step: 0.1, desc: 'Deutlich über dem eigenen Rhythmus → sofort handeln' },
    ]
  },
  {
    label: 'CLV-Prognose',
    icon: <TrendingUp size={15} />,
    items: [
      { key: 'prognoseJahre', label: 'Prognosehorizont (Jahre)', min: 1, max: 10, step: 1, desc: 'Über wie viele Jahre der künftige Umsatz gerechnet wird' },
      { key: 'abzinsungProzent', label: 'Abzinsung (% pro Jahr)', min: 0, max: 25, step: 1, desc: 'Umsatz in fünf Jahren ist weniger wert als Umsatz heute' },
    ]
  },
  {
    label: 'CLV-Tier Bonus-Punkte',
    icon: <SlidersHorizontal size={15} />,
    items: [
      { key: 'clvTierABonus', label: 'Tier A Bonus', min: 0, max: 100, step: 5, desc: 'Zusatzpunkte für Tier-A-Kunden' },
      { key: 'clvTierBBonus', label: 'Tier B Bonus', min: 0, max: 100, step: 5, desc: 'Zusatzpunkte für Tier-B-Kunden' },
    ]
  },
]

export default function EinstellungenPage() {
  const {
    settings, setSettings, templatesA, templatesB, setTemplates,
    backups, restoreBackup, exportBackup, importBackup, refreshBackups, customers,
  } = useVinora()
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [local, setLocal] = useState<RfmSettings>({ ...settings })
  const [saved, setSaved] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false, 3: false })
  const [templateTab, setTemplateTab] = useState<'A' | 'B'>('A')

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [restoreMsg, setRestoreMsg] = useState('')

  function saveSettings() {
    setSettings(local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function resetToDefault() {
    if (!confirm('Alle Einstellungen auf Standardwerte zurücksetzen?')) return
    setLocal({ ...DEFAULT_SETTINGS })
    setSettings(DEFAULT_SETTINGS)
  }

  function toggleGroup(i: number) {
    setOpenGroups(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C0A0F]" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Einstellungen</h1>
          <p className="text-sm text-[#8B6070] mt-1">RFM-Schwellwerte · CLV-Grenzen · A/B-Test · Nachrichtenvorlagen</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefault} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#8B6070] hover:text-[#6B2737] border cursor-pointer" style={{ borderColor: '#E8D5C0', background: 'white' }}>
            <RotateCcw size={13} /> Standard
          </button>
          <button onClick={saveSettings} disabled={!isDirty} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white font-medium cursor-pointer disabled:opacity-40" style={{ background: saved ? '#27ae60' : 'linear-gradient(135deg, #6B2737, #8B3348)' }}>
            <Save size={14} /> {saved ? 'Gespeichert ✓' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#E8D5C0' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7e3af215', color: '#7e3af2' }}><FlaskConical size={16} /></div>
              <div>
                <div className="text-sm font-semibold text-[#1C0A0F]">A/B-Test aktiviert</div>
                <div className="text-xs text-[#8B6070]">Kunden werden deterministisch Variante A oder B zugewiesen</div>
              </div>
            </div>
            <button onClick={() => setLocal(prev => ({ ...prev, abTestingEnabled: !prev.abTestingEnabled }))} className="relative w-12 h-6 rounded-full transition-all cursor-pointer" style={{ background: local.abTestingEnabled ? '#6B2737' : '#D1C4C8' }}>
              <span className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: local.abTestingEnabled ? '26px' : '4px' }} />
            </button>
          </div>
        </div>

        {SETTING_GROUPS.map((group, gi) => (
          <div key={gi} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
            <button onClick={() => toggleGroup(gi)} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-[#FAFAF7]">
              <div className="flex items-center gap-2"><span className="text-[#6B2737]">{group.icon}</span><span className="text-sm font-semibold text-[#1C0A0F]">{group.label}</span></div>
              {openGroups[gi] ? <ChevronUp size={15} color="#8B6070" /> : <ChevronDown size={15} color="#8B6070" />}
            </button>
            {openGroups[gi] && (
              <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#F0EDE6' }}>
                {group.items.map(item => (
                  <div key={item.key} className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[#1C0A0F]">{item.label}</label>
                      <span className="text-sm font-bold" style={{ color: '#6B2737' }}>
                        {item.key.includes('clvTier') && !item.key.includes('Bonus') ? `${(local[item.key as keyof RfmSettings] as number).toLocaleString('de-DE')} €` : String(local[item.key as keyof RfmSettings])}
                      </span>
                    </div>
                    <input type="range" min={item.min} max={item.max} step={item.step}
                      value={local[item.key as keyof RfmSettings] as number}
                      onChange={e => setLocal(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                      className="w-full cursor-pointer accent-[#6B2737]"
                    />
                    <div className="flex justify-between text-[10px] text-[#B09090] mt-0.5">
                      <span>{item.min}{item.key.includes('clvTier') && !item.key.includes('Bonus') ? ' €' : ''}</span>
                      <span className="text-center text-[#8B6070] italic">{item.desc}</span>
                      <span>{item.max}{item.key.includes('clvTier') && !item.key.includes('Bonus') ? ' €' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#F0EDE6' }}>
            <div className="flex items-center gap-2"><MessageSquare size={15} color="#6B2737" /><span className="text-sm font-semibold text-[#1C0A0F]">Eigene Nachrichtenvorlagen</span></div>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E8D5C0' }}>
              {(['A', 'B'] as const).map(v => (
                <button key={v} onClick={() => setTemplateTab(v)} className="px-3 py-1 text-xs font-medium cursor-pointer" style={{ background: templateTab === v ? '#6B2737' : 'white', color: templateTab === v ? 'white' : '#8B6070' }}>Variante {v}</button>
              ))}
            </div>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-[#8B6070] mb-3">Platzhalter: <code className="bg-[#F0EDE6] px-1 rounded">[Vorname]</code>, <code className="bg-[#F0EDE6] px-1 rounded">[Lieblingssorte]</code>, <code className="bg-[#F0EDE6] px-1 rounded">[CLV]</code></p>
            {ALL_ACTION_TYPES.map(type => {
              const val = templateTab === 'A' ? (templatesA[type] || '') : (templatesB[type] || '')
              const isEditing = editingKey === `${templateTab}-${type}`
              return (
                <div key={type} className="rounded-lg border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
                  <button onClick={() => setEditingKey(isEditing ? null : `${templateTab}-${type}`)} className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer hover:bg-[#FAFAF7]">
                    <span className="text-xs font-medium text-[#1C0A0F]">{type}</span>
                    <span className="text-[10px] text-[#8B6070]">{val ? '● Eigene Vorlage' : 'Standard'}</span>
                  </button>
                  {isEditing && (
                    <div className="border-t p-3" style={{ borderColor: '#F0EDE6' }}>
                      <textarea rows={5} value={val}
                        onChange={e => {
                          const v = e.target.value
                          if (templateTab === 'A') setTemplates('A', { ...templatesA, [type]: v })
                          else setTemplates('B', { ...templatesB, [type]: v })
                        }}
                        placeholder="Leer lassen = Standard-Vorlage"
                        className="w-full px-3 py-2 text-xs rounded-lg border bg-white resize-none focus:outline-none" style={{ borderColor: '#E8D5C0' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sicherung – alles bleibt lokal, aber nichts geht verloren */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E8D5C0' }}>
          <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: '#F0EDE6' }}>
            <History size={15} color="#6B2737" />
            <span className="text-sm font-semibold text-[#1C0A0F]">Sicherung</span>
          </div>
          <div className="p-4">
            <p className="text-xs text-[#8B6070] mb-4 leading-relaxed">
              Alle Daten liegen ausschließlich in diesem Browser auf diesem Rechner. Vor jedem Import legt Vinora
              automatisch einen Wiederherstellungspunkt an. Für den Rechnerwechsel oder eine externe Sicherung die
              Backup-Datei exportieren.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={exportBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: '#1C0A0F', color: 'white' }}>
                <HardDriveDownload size={14} /> Backup-Datei speichern
              </button>
              <button onClick={() => backupInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border"
                style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                <HardDriveUpload size={14} /> Sicherung einspielen
              </button>
              <input ref={backupInputRef} type="file" accept=".json" className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    await importBackup(f)
                    setRestoreMsg('Sicherung eingespielt.')
                  } catch {
                    setRestoreMsg('Datei konnte nicht gelesen werden.')
                  }
                  e.target.value = ''
                  setTimeout(() => setRestoreMsg(''), 3000)
                }} />
            </div>
            {restoreMsg && <p className="text-xs mb-3" style={{ color: '#27ae60' }}>{restoreMsg}</p>}

            <p className="text-xs font-semibold text-[#1C0A0F] mb-2">
              Automatische Wiederherstellungspunkte ({backups.length})
            </p>
            {backups.length === 0 ? (
              <p className="text-xs text-[#8B6070]">
                Noch keiner vorhanden – der erste entsteht beim nächsten Import.
                {customers.length > 0 ? '' : ' Aktuell sind keine Kundendaten geladen.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {backups.map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 text-xs border-b pb-1.5" style={{ borderColor: '#F0E8DC' }}>
                    <span className="min-w-0">
                      <span className="font-medium text-[#1C0A0F]">{b.label}</span>
                      <span className="block text-[#8B6070]">
                        {fmtDate(b.createdAt)} · {b.customerCount} Kunden · {b.actionCount} Maßnahmen
                      </span>
                    </span>
                    <button onClick={async () => {
                        await restoreBackup(b.id)
                        await refreshBackups()
                        setRestoreMsg('Stand wiederhergestellt.')
                        setTimeout(() => setRestoreMsg(''), 3000)
                      }}
                      className="flex-shrink-0 px-3 py-1 rounded-lg border cursor-pointer"
                      style={{ borderColor: '#6B2737', color: '#6B2737' }}>
                      Wiederherstellen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4 text-xs text-[#8B6070]" style={{ background: '#FFF8F0', border: '1px solid #F0D8B0' }}>
          <div className="font-semibold text-[#1C0A0F] mb-1">ℹ️ Hinweis</div>
          Gespeicherte Schwellwerte werden sofort auf die vorhandenen Kundendaten angewendet – ein erneuter CSV-Import ist nicht nötig.
          Vorlagen werden beim Tippen gespeichert.
        </div>
      </div>
    </div>
  )
}
