"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Header } from "@/components/header"
import { DiaryCard } from "@/components/diary-card"
import { TranscriptToggle } from "@/components/transcript-toggle"
import { Button } from "@/components/ui/button"
import { useEntryByDate, useHydrated, updateEntry, deleteEntry } from "@/lib/storage"
import { parseKey, formatLong } from "@/lib/date"
import type { DiaryEntry } from "@/lib/types"

export default function EntryPage() {
  const params = useParams<{ date: string }>()
  const router = useRouter()
  const date = params.date
  const entry = useEntryByDate(date)
  const hydrated = useHydrated()

  const handlePatch = (patch: Partial<DiaryEntry>) => {
    if (!entry) return
    updateEntry(entry.id, patch)
  }

  const handleDelete = () => {
    if (!entry) return
    if (!confirm("Diesen Eintrag wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return
    deleteEntry(entry.id)
    toast.success("Eintrag gelöscht.")
    router.push("/history")
  }

  return (
    <div className="paper-texture grain min-h-dvh">
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-8">
        <Link href="/history" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="size-3.5" /> Zum Verlauf
        </Link>

        {!hydrated ? null : !entry ? (
          <div className="text-center py-20">
            <div className="serif text-2xl mb-2">Kein Eintrag für diesen Tag</div>
            <p className="text-muted-foreground text-[14.5px]">Vielleicht hast du das Datum verändert oder den Eintrag gelöscht.</p>
          </div>
        ) : (
          <>
            <header className="mb-8">
              <div className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">{formatLong(parseKey(entry.date))}</div>
              <h1 className="serif text-4xl sm:text-5xl mt-2 leading-[1.05]">
                {entry.affirmation || entry.highlights[0] || "Dein Eintrag"}
                <span className="text-amber">.</span>
              </h1>
            </header>

            <div className="space-y-5">
              <DiaryCard entry={entry} onPatch={handlePatch} />
              <TranscriptToggle transcript={entry.transcript} />

              <div className="flex justify-end pt-4">
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" /> Eintrag löschen
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
