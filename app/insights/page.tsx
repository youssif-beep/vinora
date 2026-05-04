"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Sparkles, Loader2, Calendar, TrendingUp } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { useEntries, useHydrated } from "@/lib/storage"
import { avgMood } from "@/lib/streak"
import type { DiaryEntry } from "@/lib/types"
import { todayKey, addDays, parseKey, formatShort } from "@/lib/date"

type Insight = {
  title: string
  patterns: string
  energy: string
  invitation: string
  averageMood: number | null
}

type Range = "7" | "14" | "30"

export default function InsightsPage() {
  const entries = useEntries()
  const hydrated = useHydrated()
  const [range, setRange] = React.useState<Range>("7")
  const [insight, setInsight] = React.useState<Insight | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const inRange = React.useMemo(() => {
    const days = parseInt(range, 10)
    const cutoffKey = todayKey(addDays(new Date(), -days + 1))
    return entries.filter((e) => e.date >= cutoffKey).sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [entries, range])

  const generate = async () => {
    setLoading(true)
    setError(null)
    setInsight(null)
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: inRange.map((e) => ({
            date: e.date,
            gratitude: e.gratitude,
            highlights: e.highlights,
            affirmation: e.affirmation,
            tomorrowGreat: e.tomorrowGreat,
            improvement: e.improvement,
            mood: e.mood,
          })),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Reflexion fehlgeschlagen.")
      }
      setInsight((await res.json()) as Insight)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const moodAvg = avgMood(inRange)

  return (
    <div className="paper-texture grain min-h-dvh">
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-8 sm:pt-12">
        <div className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">Reflexion</div>
        <h1 className="serif text-4xl sm:text-5xl mt-2 leading-[1.05] mb-6">Was sich zeigt<span className="text-amber">.</span></h1>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(["7", "14", "30"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setInsight(null); setError(null) }}
              className={`px-3.5 h-8 rounded-full text-[13px] transition ${range === r ? "bg-foreground text-background" : "border bg-card hover:bg-muted"}`}
            >
              Letzte {r} Tage
            </button>
          ))}
        </div>

        {hydrated && (
          <>
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <Stat icon={Calendar} label="Einträge" value={`${inRange.length}`} />
              <Stat icon={TrendingUp} label="Ø Stimmung" value={moodAvg == null ? "—" : `${moodAvg}/10`} />
              <Stat icon={Sparkles} label="Affirmationen" value={`${inRange.filter((e) => e.affirmation).length}`} />
            </div>

            <MoodSpark entries={inRange} />

            <div className="mt-8">
              {inRange.length < 2 ? (
                <div className="rounded-2xl border bg-card hairline p-6 text-center">
                  <div className="serif text-xl mb-1">Noch zu wenige Einträge</div>
                  <p className="text-muted-foreground text-[14.5px]">
                    Schreib mindestens zwei Einträge in diesem Zeitraum, um eine Reflexion von Claude zu bekommen.
                  </p>
                </div>
              ) : !insight ? (
                <div className="rounded-2xl border bg-card hairline p-6 text-center">
                  <div className="serif text-xl mb-1">Reflexion abrufen</div>
                  <p className="text-muted-foreground text-[14.5px] mb-4">
                    Claude liest die letzten {range} Tage und schreibt dir eine kurze Zusammenfassung — Muster, Energiequellen, eine Einladung für die kommende Woche.
                  </p>
                  <Button onClick={generate} disabled={loading} className="rounded-full bg-foreground text-background h-10 px-5">
                    {loading ? <><Loader2 className="size-4 animate-spin" /> Lese …</> : <><Sparkles className="size-4" /> Reflexion erstellen</>}
                  </Button>
                  {error && <div className="text-destructive text-sm mt-3">{error}</div>}
                </div>
              ) : (
                <motion.article
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border bg-card hairline p-6 sm:p-8"
                >
                  <div className="text-[11px] uppercase tracking-[0.14em] text-amber font-medium mb-1">Deine Woche</div>
                  <h2 className="serif text-3xl leading-tight mb-6">{insight.title}<span className="text-amber">.</span></h2>
                  <Section title="Was sich zeigt">{insight.patterns}</Section>
                  <Section title="Was Energie gegeben hat">{insight.energy}</Section>
                  <Section title="Eine Idee für die nächste Woche" emphasis>{insight.invitation}</Section>
                  <div className="mt-6 pt-4 border-t hairline flex items-center justify-between text-[12.5px] text-muted-foreground">
                    <span>Generiert mit Claude · auf Basis von {inRange.length} Einträgen</span>
                    <button onClick={generate} className="hover:text-foreground transition">Neu erstellen</button>
                  </div>
                </motion.article>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card hairline p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="serif text-3xl mt-1 tabular-nums">{value}</div>
    </div>
  )
}

function Section({ title, children, emphasis }: { title: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">{title}</div>
      <p className={emphasis ? "serif text-[18px] leading-snug" : "text-[15px] leading-relaxed"}>{children}</p>
    </section>
  )
}

function MoodSpark({ entries }: { entries: DiaryEntry[] }) {
  if (entries.length === 0) return null
  const points = entries.map((e) => ({ date: e.date, mood: e.mood }))
  const max = 10
  return (
    <div className="rounded-2xl border bg-card hairline p-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Stimmungsverlauf</div>
      <div className="flex items-end gap-1 h-24">
        {points.map((p, i) => {
          const h = p.mood == null ? 4 : (p.mood / max) * 100
          const color =
            p.mood == null
              ? "bg-muted"
              : p.mood <= 3
                ? "bg-destructive/70"
                : p.mood <= 6
                  ? "bg-amber/80"
                  : "bg-emerald-600/80"
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group/spark">
              <div className="w-full rounded-md bg-muted/40 flex items-end h-full">
                <div className={`w-full rounded-md transition-all ${color}`} style={{ height: `${h}%` }} />
              </div>
              <div className="text-[9.5px] text-muted-foreground tabular-nums opacity-0 group-hover/spark:opacity-100 transition">
                {formatShort(parseKey(p.date)).slice(0, 5)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
