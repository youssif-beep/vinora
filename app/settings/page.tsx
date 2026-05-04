"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Download, Upload, Trash2, Github, Lock } from "lucide-react"
import { toast } from "sonner"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useEntries, useHydrated, exportJson, importJson, clearAllEntries } from "@/lib/storage"

export default function SettingsPage() {
  const entries = useEntries()
  const hydrated = useHydrated()
  const fileRef = React.useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    const json = exportJson()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `heute-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export gestartet.")
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importJson(String(reader.result))
        toast.success("Import abgeschlossen.", { description: `${result.added} neue Einträge importiert.` })
      } catch (err) {
        toast.error("Import fehlgeschlagen.", { description: err instanceof Error ? err.message : String(err) })
      }
    }
    reader.readAsText(file)
  }

  const handleClear = () => {
    if (!confirm("Wirklich ALLE Einträge unwiderruflich löschen?")) return
    if (!confirm("Wirklich? Das kann nicht rückgängig gemacht werden.")) return
    clearAllEntries()
    toast.success("Alle Einträge gelöscht.")
  }

  return (
    <div className="paper-texture grain min-h-dvh">
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="size-3.5" /> Zurück
        </Link>

        <div className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">Einstellungen</div>
        <h1 className="serif text-4xl mt-2 leading-[1.05] mb-8">Einstellungen<span className="text-amber">.</span></h1>

        <div className="space-y-4">
          {/* Privacy */}
          <Section title="Privatsphäre">
            <div className="flex items-start gap-3">
              <Lock className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-[14.5px] leading-relaxed">
                Alle Einträge werden ausschließlich lokal in deinem Browser (LocalStorage) gespeichert. Sie werden nie hochgeladen — nur das anonyme Audio
                geht für die Transkription kurzzeitig an OpenAI Whisper, und das Transkript für die Strukturierung an Anthropic Claude. Beide Anbieter speichern
                keine Inhalte für das Training (Default-Einstellung).
              </div>
            </div>
          </Section>

          {/* Daten */}
          <Section title="Daten">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleExport} disabled={!hydrated || entries.length === 0} variant="outline">
                <Download className="size-4" /> Export (JSON)
              </Button>
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                <Upload className="size-4" /> Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImport(f)
                  e.target.value = ""
                }}
              />
              <Button onClick={handleClear} variant="destructive">
                <Trash2 className="size-4" /> Alles löschen
              </Button>
            </div>
            {hydrated && (
              <div className="text-[12.5px] text-muted-foreground mt-3 tabular-nums">
                {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"} lokal gespeichert
              </div>
            )}
          </Section>

          {/* Setup */}
          <Section title="Einrichtung">
            <div className="text-[14.5px] leading-relaxed">
              Damit Aufnahme, Transkription und Strukturierung funktionieren, brauchst du zwei API-Keys:
              <ul className="mt-3 space-y-1.5 text-[13.5px]">
                <li className="flex items-baseline gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">OPENAI_API_KEY</code>
                  <span className="text-muted-foreground">— für Whisper-Transkription</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">ANTHROPIC_API_KEY</code>
                  <span className="text-muted-foreground">— für Claude-Strukturierung</span>
                </li>
              </ul>
              <div className="mt-3 text-[13.5px] text-muted-foreground">
                Lege eine <code className="rounded bg-muted px-1 py-0.5 text-[12px]">.env.local</code> im Projekt-Root an und starte den Dev-Server neu.
              </div>
            </div>
          </Section>

          <Section title="Über">
            <div className="text-[14.5px] text-muted-foreground leading-relaxed">
              <span className="text-foreground serif text-[16px]">Heute<span className="text-amber">.</span></span> ist ein digitales Tagebuch im Stil des
              6-Minuten-Tagebuchs — du sprichst eine Sprachnachricht und der Eintrag wird automatisch in die sechs Felder strukturiert.
            </div>
            <div className="mt-3 text-[12.5px] text-muted-foreground inline-flex items-center gap-1.5">
              <Github className="size-3.5" /> Open Source · alles bleibt lokal
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card hairline p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">{title}</div>
      {children}
    </section>
  )
}
