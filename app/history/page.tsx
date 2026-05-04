"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Calendar, Search } from "lucide-react"
import { Header } from "@/components/header"
import { StreakBadge } from "@/components/streak-badge"
import { useEntries, useHydrated } from "@/lib/storage"
import { currentStreak, longestStreak } from "@/lib/streak"
import { formatRelative, formatShort, parseKey } from "@/lib/date"
import type { DiaryEntry } from "@/lib/types"

export default function HistoryPage() {
  const entries = useEntries()
  const hydrated = useHydrated()
  const [q, setQ] = React.useState("")

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return entries
    return entries.filter((e) => {
      const blob = [
        e.transcript,
        e.affirmation,
        e.improvement,
        e.goodDeed ?? "",
        ...e.gratitude,
        ...e.highlights,
        ...e.tomorrowGreat,
      ]
        .join(" ")
        .toLowerCase()
      return blob.includes(term)
    })
  }, [entries, q])

  const grouped = React.useMemo(() => groupByMonth(filtered), [filtered])

  return (
    <div className="paper-texture grain min-h-dvh">
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-8 sm:pt-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">Verlauf</div>
            <h1 className="serif text-4xl sm:text-5xl mt-2 leading-[1.05]">Alle Tage<span className="text-amber">.</span></h1>
          </div>
          {hydrated && entries.length > 0 && (
            <StreakBadge streak={currentStreak(entries)} longest={longestStreak(entries)} total={entries.length} />
          )}
        </div>

        {hydrated && entries.length > 0 && (
          <div className="relative mb-6">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="In Einträgen suchen …"
              className="w-full rounded-full border bg-card/60 pl-10 pr-4 h-11 text-[14.5px] outline-none focus-visible:ring-2 ring-amber/50"
            />
          </div>
        )}

        {!hydrated ? null : entries.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Keine Einträge gefunden.</div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ label, items }) => (
              <section key={label}>
                <div className="serif text-[15px] text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="size-3.5" /> {label}
                </div>
                <ul className="space-y-2.5">
                  {items.map((e, i) => (
                    <EntryRow key={e.id} entry={e} index={i} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EntryRow({ entry, index }: { entry: DiaryEntry; index: number }) {
  const d = parseKey(entry.date)
  const moodColor = entry.mood == null ? "bg-muted" : entry.mood <= 3 ? "bg-destructive/70" : entry.mood <= 6 ? "bg-amber/80" : "bg-emerald-600/80"
  const headline =
    entry.affirmation ||
    entry.highlights[0] ||
    entry.gratitude[0] ||
    entry.transcript.slice(0, 90) + (entry.transcript.length > 90 ? "…" : "")
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
    >
      <Link
        href={`/entry/${entry.date}`}
        className="group/row flex items-center gap-4 rounded-2xl border bg-card hover:bg-card/80 transition px-4 py-3.5 hairline"
      >
        <div className="flex flex-col items-center w-12 shrink-0">
          <span className="serif text-2xl leading-none tabular-nums">{d.getDate()}</span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
            {d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="serif text-[16.5px] leading-snug truncate">{headline || "—"}</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{formatRelative(d)}</span>
            <span className="opacity-40">·</span>
            <span>{formatShort(d)}</span>
            {entry.gratitude.length > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span>{entry.gratitude.length} Dankbarkeit</span>
              </>
            )}
            {entry.highlights.length > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span>{entry.highlights.length} Highlights</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`inline-block size-2.5 rounded-full ${moodColor}`} title={entry.mood == null ? "Keine Stimmung" : `Stimmung ${entry.mood}/10`} />
          <ArrowRight className="size-4 text-muted-foreground transition group-hover/row:translate-x-0.5 group-hover/row:text-foreground" />
        </div>
      </Link>
    </motion.li>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="serif text-2xl mb-2">Noch keine Einträge</div>
      <p className="text-muted-foreground text-[14.5px] mb-6 max-w-sm mx-auto">
        Sobald du heute deine erste Sprachnachricht aufnimmst, erscheint sie hier.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 h-10 text-sm font-medium hover:opacity-90 transition"
      >
        Heute reflektieren <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

function groupByMonth(entries: DiaryEntry[]): { label: string; items: DiaryEntry[] }[] {
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
  const map = new Map<string, DiaryEntry[]>()
  for (const e of entries) {
    const d = parseKey(e.date)
    const key = `${months[d.getMonth()]} ${d.getFullYear()}`
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}
