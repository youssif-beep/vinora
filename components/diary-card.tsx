"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Heart, Sparkles, Sunrise, Wrench, Quote, Activity, HandHeart, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { EditableList, EditableSingle, EditableMood } from "@/components/editable"
import type { DiaryEntry } from "@/lib/types"

type Props = {
  entry: DiaryEntry
  onPatch: (patch: Partial<DiaryEntry>) => void
  readOnly?: boolean
}

type Field = {
  key: keyof DiaryEntry
  title: string
  hint: string
  icon: LucideIcon
  kind: "list" | "single" | "mood"
  max?: number
  span?: 1 | 2
  serif?: boolean
}

const FIELDS: Field[] = [
  { key: "gratitude", title: "Dankbarkeit", hint: "Wofür ich heute dankbar bin", icon: Heart, kind: "list", max: 3 },
  { key: "highlights", title: "Highlights", hint: "Was heute großartig war", icon: Sparkles, kind: "list", max: 3 },
  { key: "affirmation", title: "Affirmation", hint: "Mein Satz für morgen", icon: Quote, kind: "single", span: 2, serif: true },
  { key: "tomorrowGreat", title: "Morgen großartig", hint: "Was den nächsten Tag großartig macht", icon: Sunrise, kind: "list", max: 3 },
  { key: "improvement", title: "Verbesserung", hint: "Was noch besser sein könnte", icon: Wrench, kind: "single" },
  { key: "mood", title: "Stimmung", hint: "Heute auf einer Skala von 1–10", icon: Activity, kind: "mood" },
  { key: "goodDeed", title: "Gute Tat", hint: "Optional — etwas, das du gegeben hast", icon: HandHeart, kind: "single", span: 2 },
]

export function DiaryCard({ entry, onPatch, readOnly }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {FIELDS.map((f, i) => {
        const Icon = f.icon
        const empty = isEmpty(entry, f)
        return (
          <motion.section
            key={String(f.key)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "group/field rounded-2xl border bg-card p-5 sm:p-6 transition hairline",
              f.span === 2 && "sm:col-span-2",
              empty && "bg-card/50",
            )}
          >
            <header className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-full bg-amber-soft/40 text-amber flex items-center justify-center">
                  <Icon className="size-3.5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{f.title}</div>
                </div>
              </div>
            </header>

            {f.kind === "list" && (
              <EditableList
                values={(entry[f.key] as string[]) ?? []}
                onChange={(v) => onPatch({ [f.key]: v } as Partial<DiaryEntry>)}
                placeholder={f.hint}
                max={f.max ?? 3}
                readOnly={readOnly}
              />
            )}
            {f.kind === "single" && (
              <EditableSingle
                value={(entry[f.key] as string) ?? ""}
                onChange={(v) => onPatch({ [f.key]: v } as Partial<DiaryEntry>)}
                placeholder={f.hint}
                serif={f.serif}
                readOnly={readOnly}
              />
            )}
            {f.kind === "mood" && (
              <EditableMood
                value={entry.mood}
                onChange={(v) => onPatch({ mood: v })}
                readOnly={readOnly}
              />
            )}
          </motion.section>
        )
      })}
    </div>
  )
}

function isEmpty(e: DiaryEntry, f: Field): boolean {
  const v = e[f.key]
  if (f.kind === "list") return !Array.isArray(v) || v.length === 0
  if (f.kind === "mood") return e.mood == null
  return !v || (typeof v === "string" && v.trim() === "")
}
