"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

const CUES: { tag: string; question: string; hint: string }[] = [
  { tag: "Dankbarkeit", question: "Wofür bist du heute dankbar?", hint: "Drei Dinge — gerne klein und konkret." },
  { tag: "Highlights", question: "Was war heute großartig?", hint: "Drei Momente, Begegnungen, kleine Siege." },
  { tag: "Affirmation", question: "Was ist dein Satz für morgen?", hint: "Ein einziger Ich-bin-Satz. Kraftvoll, kurz." },
  { tag: "Morgen", question: "Was würde morgen großartig machen?", hint: "Drei Dinge, die du in der Hand hast." },
  { tag: "Verbesserung", question: "Was hätte heute noch besser sein können?", hint: "Sanft. Lernen, nicht hadern." },
  { tag: "Stimmung", question: "Wie war dein Tag auf einer Skala von 1–10?", hint: "Bauchgefühl reicht." },
]

type Props = { active: boolean; intervalMs?: number }

export function CueCards({ active, intervalMs = 5500 }: Props) {
  const [idx, setIdx] = React.useState(0)

  React.useEffect(() => {
    if (!active) return
    const t = setInterval(() => setIdx((i) => (i + 1) % CUES.length), intervalMs)
    return () => clearInterval(t)
  }, [active, intervalMs])

  // Wenn nicht aktiv, alle als Liste zeigen.
  if (!active) {
    return (
      <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-2.5">
        {CUES.map((c) => (
          <div
            key={c.tag}
            className="rounded-2xl border bg-card/60 backdrop-blur-sm p-4 hairline"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{c.tag}</div>
            <div className="serif text-[17px] leading-snug">{c.question}</div>
            <div className="text-[12.5px] text-muted-foreground mt-1">{c.hint}</div>
          </div>
        ))}
      </div>
    )
  }

  const cur = CUES[idx]
  return (
    <div className="w-full max-w-xl h-28 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.tag}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 rounded-2xl bg-card/70 backdrop-blur-sm p-5 flex flex-col items-center justify-center text-center hairline border"
        >
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-amber font-medium mb-1">{cur.tag}</div>
          <div className="serif text-[20px] sm:text-[22px] leading-tight">{cur.question}</div>
          <div className="text-[12.5px] text-muted-foreground mt-1.5">{cur.hint}</div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
        {CUES.map((_, i) => (
          <span key={i} className={`size-1 rounded-full transition ${i === idx ? "bg-foreground" : "bg-foreground/20"}`} />
        ))}
      </div>
    </div>
  )
}
