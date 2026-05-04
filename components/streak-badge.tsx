"use client"

import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

export function StreakBadge({ streak, longest, total, className }: { streak: number; longest: number; total: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3 rounded-full border bg-card/60 px-4 py-1.5 hairline", className)}>
      <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums">
        <Flame className={cn("size-3.5", streak > 0 ? "text-amber" : "text-muted-foreground")} />
        <span className="font-medium">{streak}</span>
        <span className="text-muted-foreground">{streak === 1 ? "Tag" : "Tage"} in Folge</span>
      </span>
      <span className="text-muted-foreground/50">·</span>
      <span className="text-[12.5px] text-muted-foreground tabular-nums">längste {longest}</span>
      <span className="text-muted-foreground/50">·</span>
      <span className="text-[12.5px] text-muted-foreground tabular-nums">{total} gesamt</span>
    </div>
  )
}
