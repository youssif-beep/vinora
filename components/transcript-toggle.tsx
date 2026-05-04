"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function TranscriptToggle({ transcript }: { transcript: string }) {
  const [open, setOpen] = React.useState(false)
  if (!transcript) return null
  return (
    <div className="rounded-2xl border bg-card/60 hairline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Transkript</span>
        <ChevronDown className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-[14.5px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{transcript}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
