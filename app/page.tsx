"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, Pencil, Settings as SettingsIcon } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Header } from "@/components/header"
import { Recorder, type RecorderResult } from "@/components/recorder"
import { DiaryCard } from "@/components/diary-card"
import { TranscriptToggle } from "@/components/transcript-toggle"
import { StreakBadge } from "@/components/streak-badge"
import { Button } from "@/components/ui/button"
import { saveEntry, updateEntry, useEntries, useHydrated } from "@/lib/storage"
import { todayKey, formatLong, greeting } from "@/lib/date"
import { currentStreak, longestStreak } from "@/lib/streak"
import type { DiaryEntry, StructuredFields } from "@/lib/types"

type Mode = "auto" | "record" | "structuring"

export default function HomePage() {
  const hydrated = useHydrated()
  const allEntries = useEntries()
  const today = React.useMemo(() => allEntries.find((e) => e.date === todayKey()), [allEntries])
  const [mode, setMode] = React.useState<Mode>("auto")

  const handleRecorderComplete = async (r: RecorderResult) => {
    setMode("structuring")
    try {
      const sRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: r.transcript }),
      })
      if (!sRes.ok) {
        const j = await sRes.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Strukturierung fehlgeschlagen.")
      }
      const fields = (await sRes.json()) as StructuredFields
      saveEntry({
        date: todayKey(),
        transcript: r.transcript,
        durationSec: r.durationSec,
        source: r.durationSec > 0 ? "voice" : "text",
        ...fields,
      })
      setMode("auto")
      toast.success("Eintrag gespeichert.", {
        description: "Du kannst jedes Feld noch nachbearbeiten.",
      })
    } catch (err) {
      toast.error("Strukturierung fehlgeschlagen.", {
        description: err instanceof Error ? err.message : String(err),
      })
      setMode("record")
    }
  }

  const handlePatch = (patch: Partial<DiaryEntry>) => {
    if (!today) return
    updateEntry(today.id, patch)
  }

  const now = new Date()
  const streak = currentStreak(allEntries, now)
  const longest = longestStreak(allEntries)

  // Effective mode resolution
  const showMode: "intro" | "record" | "structuring" | "view" =
    mode === "structuring" ? "structuring"
    : mode === "record" ? "record"
    : today ? "view"
    : "intro"

  return (
    <div className="paper-texture grain min-h-dvh">
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-8 sm:pt-12">
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">
            {formatLong(now)}
          </div>
          <h1 className="serif text-4xl sm:text-5xl mt-2 leading-[1.05]">
            {greeting(now)}<span className="text-amber">.</span>
          </h1>
          {hydrated && allEntries.length > 0 && (
            <div className="mt-5 flex justify-center">
              <StreakBadge streak={streak} longest={longest} total={allEntries.length} />
            </div>
          )}
        </motion.section>

        <AnimatePresence mode="wait">
          {!hydrated ? (
            <motion.div key="hyd" className="flex justify-center py-20">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </motion.div>
          ) : showMode === "intro" ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-12 py-6"
            >
              <p className="max-w-lg text-center serif text-[20px] sm:text-[22px] leading-snug">
                {allEntries.length > 0
                  ? "Eine Sprachnachricht. Dein Tag, strukturiert."
                  : "Eine Sprachnachricht. Sechs Felder. Dein Tag, in deinen eigenen Worten."}
              </p>
              <Recorder onComplete={handleRecorderComplete} />
            </motion.div>
          ) : showMode === "record" ? (
            <motion.div
              key="rec"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6"
            >
              <Recorder
                onComplete={handleRecorderComplete}
                onCancel={today ? () => setMode("auto") : undefined}
              />
            </motion.div>
          ) : showMode === "structuring" ? (
            <motion.div
              key="struct"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="size-7 animate-spin text-amber" />
              <div className="serif text-xl">Claude liest mit …</div>
              <div className="text-sm text-muted-foreground max-w-sm text-center">
                Dein Tag wird in die sechs Felder strukturiert. Das dauert ein paar Sekunden.
              </div>
            </motion.div>
          ) : today ? (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Eintrag für heute gespeichert
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMode("record")} className="rounded-full">
                  <Pencil className="size-3.5" /> Neu aufnehmen
                </Button>
              </div>
              <DiaryCard entry={today} onPatch={handlePatch} />
              <TranscriptToggle transcript={today.transcript} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-16 flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span>Einträge bleiben lokal auf deinem Gerät.</span>
          <span className="opacity-30">·</span>
          <Link href="/settings" className="inline-flex items-center gap-1 hover:text-foreground transition">
            <SettingsIcon className="size-3" /> Einstellungen
          </Link>
        </div>
      </main>
    </div>
  )
}
