"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Inline-editierbare Felder für die Tagebuchkarten.
 * Klick = Edit, Blur = Speichern. Liste mit + / x.
 */

export function EditableSingle({
  value,
  onChange,
  placeholder,
  serif,
  readOnly,
  multiline = true,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  serif?: boolean
  readOnly?: boolean
  multiline?: boolean
}) {
  const [draft, setDraft] = React.useState(value)
  const [lastSyncedValue, setLastSyncedValue] = React.useState(value)
  const ref = React.useRef<HTMLTextAreaElement | null>(null)

  // "Adjust state when prop changes": externe Änderungen am value (z.B. AI-Update)
  // ins lokale Draft-State spiegeln, ohne im Effekt zu schreiben.
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value)
    setDraft(value)
  }

  const Tag = multiline ? "textarea" : "input"
  const fontClass = serif ? "serif text-[19px] leading-snug" : "text-[15px] leading-relaxed"

  if (readOnly) {
    return value ? (
      <div className={cn(fontClass)}>{value}</div>
    ) : (
      <div className="text-muted-foreground italic text-[14px]">{placeholder ?? "—"}</div>
    )
  }

  return (
    <Tag
      ref={ref as never}
      value={draft}
      placeholder={placeholder}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onChange(draft.trim())
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") (e.target as HTMLElement).blur()
        if (e.key === "Escape") {
          setDraft(value)
          ;(e.target as HTMLElement).blur()
        }
        if (multiline && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          (e.target as HTMLElement).blur()
        }
      }}
      rows={multiline ? 2 : undefined}
      className={cn(
        "block w-full bg-transparent resize-none rounded-md outline-none transition",
        "focus-visible:bg-muted/60 focus-visible:px-2 focus-visible:-mx-2 focus-visible:py-1 focus-visible:-my-1",
        "placeholder:text-muted-foreground placeholder:italic",
        fontClass,
      )}
    />
  )
}

export function EditableList({
  values,
  onChange,
  placeholder,
  max = 3,
  readOnly,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  max?: number
  readOnly?: boolean
}) {
  const [drafts, setDrafts] = React.useState<string[]>(values)
  const [lastSyncedValues, setLastSyncedValues] = React.useState<string[]>(values)

  if (values !== lastSyncedValues) {
    setLastSyncedValues(values)
    setDrafts(values)
  }

  const set = (i: number, val: string) => {
    const next = [...drafts]
    next[i] = val
    setDrafts(next)
  }

  const commit = () => {
    const cleaned = drafts.map((s) => s.trim()).filter(Boolean).slice(0, max)
    if (JSON.stringify(cleaned) !== JSON.stringify(values)) onChange(cleaned)
  }

  const remove = (i: number) => {
    const next = drafts.filter((_, j) => j !== i)
    setDrafts(next)
    onChange(next.map((s) => s.trim()).filter(Boolean).slice(0, max))
  }

  const add = () => {
    if (drafts.length >= max) return
    setDrafts([...drafts, ""])
  }

  const items = readOnly ? values : drafts

  return (
    <ol className="space-y-1.5">
      {items.length === 0 && readOnly && (
        <div className="text-muted-foreground italic text-[14px]">{placeholder ?? "—"}</div>
      )}
      {items.map((v, i) => (
        <li key={i} className="group/li flex items-start gap-2.5">
          <span className="select-none mt-1 size-5 shrink-0 rounded-full bg-muted text-[10.5px] font-semibold text-muted-foreground flex items-center justify-center tabular-nums">
            {i + 1}
          </span>
          {readOnly ? (
            <span className="text-[15px] leading-relaxed flex-1">{v}</span>
          ) : (
            <>
              <input
                value={v}
                placeholder={placeholder}
                onChange={(e) => set(i, e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commit()
                    if (i === drafts.length - 1 && drafts.length < max) add()
                  }
                  if (e.key === "Backspace" && v === "") {
                    e.preventDefault()
                    remove(i)
                  }
                  if (e.key === "Escape") (e.target as HTMLElement).blur()
                }}
                className="flex-1 bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-muted-foreground placeholder:italic focus-visible:bg-muted/60 focus-visible:px-2 focus-visible:-mx-2 focus-visible:py-0.5 focus-visible:-my-0.5 rounded"
              />
              <button
                onClick={() => remove(i)}
                className="opacity-0 group-hover/li:opacity-60 hover:opacity-100 transition mt-1"
                aria-label="Entfernen"
              >
                <X className="size-3.5" />
              </button>
            </>
          )}
        </li>
      ))}
      {!readOnly && drafts.length < max && (
        <li>
          <button
            onClick={add}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition"
          >
            <Plus className="size-3.5" /> Hinzufügen
          </button>
        </li>
      )}
    </ol>
  )
}

export function EditableMood({
  value,
  onChange,
  readOnly,
}: {
  value: number | null
  onChange: (v: number | null) => void
  readOnly?: boolean
}) {
  const cells = Array.from({ length: 10 }, (_, i) => i + 1)
  return (
    <div className="flex items-center gap-1.5">
      {cells.map((n) => {
        const filled = value != null && n <= value
        return (
          <button
            key={n}
            disabled={readOnly}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "h-7 flex-1 rounded-md transition",
              filled
                ? n <= 3
                  ? "bg-destructive/70"
                  : n <= 6
                    ? "bg-amber/80"
                    : "bg-emerald-600/80"
                : "bg-muted hover:bg-muted/70",
              readOnly && "pointer-events-none",
            )}
            aria-label={`Stimmung ${n}`}
          />
        )
      })}
      <span className={cn("ml-2 w-10 text-right tabular-nums font-mono text-[13px]", value == null && "text-muted-foreground")}>
        {value == null ? "—" : `${value}/10`}
      </span>
    </div>
  )
}
