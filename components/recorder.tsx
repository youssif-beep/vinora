"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Square, Loader2, Pause, Play, RefreshCw, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { CueCards } from "@/components/cue-cards"
import { toast } from "sonner"

type Phase = "idle" | "permission" | "recording" | "paused" | "review" | "uploading" | "structuring" | "done" | "error"

export type RecorderResult = {
  transcript: string
  durationSec: number
}

type Props = {
  onComplete: (result: RecorderResult) => void
  onCancel?: () => void
  className?: string
}

export function Recorder({ onComplete, onCancel, className }: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [duration, setDuration] = React.useState(0)
  const [levels, setLevels] = React.useState<number[]>([])
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [textMode, setTextMode] = React.useState(false)
  const [textValue, setTextValue] = React.useState("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const startTsRef = React.useRef<number>(0)
  const pausedAccumRef = React.useRef<number>(0)
  const pausedAtRef = React.useRef<number>(0)
  const blobRef = React.useRef<Blob | null>(null)

  const cleanup = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
    mediaRecorderRef.current = null
  }, [])

  React.useEffect(() => () => cleanup(), [cleanup])

  const startTimer = () => {
    startTsRef.current = performance.now()
    const tick = () => {
      const elapsed = (performance.now() - startTsRef.current - pausedAccumRef.current) / 1000
      setDuration(elapsed)
      // Sample der aktuellen Lautstärke
      const a = analyserRef.current
      if (a) {
        const buf = new Uint8Array(a.fftSize)
        a.getByteTimeDomainData(buf)
        let peak = 0
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128) / 128
          if (v > peak) peak = v
        }
        setLevels((prev) => {
          const next = [...prev, peak]
          // Begrenze auf ~ Bildschirm-Breite
          if (next.length > 220) next.shift()
          return next
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const pickMime = (): string => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c
    }
    return ""
  }

  const start = async () => {
    setError(null)
    setLevels([])
    setDuration(0)
    pausedAccumRef.current = 0
    chunksRef.current = []
    blobRef.current = null
    setPreviewUrl(null)
    setPhase("permission")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const mime = pickMime()
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setPhase("review")
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
      recorder.start()

      // Audio-Analyse für Waveform
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      setPhase("recording")
      startTimer()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.includes("Permission") || msg.includes("denied")
          ? "Mikrofon-Zugriff wurde verweigert. Du kannst den Eintrag stattdessen schreiben."
          : "Aufnahme konnte nicht gestartet werden.",
      )
      setPhase("error")
      cleanup()
    }
  }

  const pause = () => {
    const r = mediaRecorderRef.current
    if (!r) return
    if (r.state === "recording") {
      r.pause()
      pausedAtRef.current = performance.now()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      setPhase("paused")
    }
  }

  const resume = () => {
    const r = mediaRecorderRef.current
    if (!r) return
    if (r.state === "paused") {
      pausedAccumRef.current += performance.now() - pausedAtRef.current
      r.resume()
      setPhase("recording")
      startTimer()
    }
  }

  const stop = () => {
    const r = mediaRecorderRef.current
    if (!r) return
    if (r.state !== "inactive") r.stop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }

  const restart = () => {
    cleanup()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    blobRef.current = null
    setLevels([])
    setDuration(0)
    setPhase("idle")
  }

  const submit = async () => {
    const blob = blobRef.current
    if (!blob) return
    setPhase("uploading")
    try {
      const fd = new FormData()
      fd.append("audio", blob, `recording.webm`)
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd })
      if (!tRes.ok) {
        const j = await tRes.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "Transkription fehlgeschlagen.")
      }
      const { text } = (await tRes.json()) as { text: string }
      setPhase("done")
      onComplete({ transcript: text, durationSec: Math.round(duration) })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setPhase("error")
      toast.error(msg)
    }
  }

  const submitText = () => {
    const t = textValue.trim()
    if (!t) {
      toast.error("Bitte schreibe ein paar Sätze über deinen Tag.")
      return
    }
    onComplete({ transcript: t, durationSec: 0 })
  }

  const isRecording = phase === "recording"
  const isPaused = phase === "paused"
  const isBusy = phase === "uploading" || phase === "structuring" || phase === "permission"

  return (
    <div className={cn("relative flex flex-col items-center gap-6 w-full", className)}>
      {/* Cue Cards: nur sichtbar in idle/recording/paused */}
      {!textMode && (phase === "idle" || isRecording || isPaused) && (
        <CueCards active={isRecording || isPaused} />
      )}

      {/* Aufnahme-UI */}
      {!textMode && (
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Waveform */}
          <AnimatePresence>
            {(isRecording || isPaused) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="w-full max-w-xl h-20 flex items-center justify-center gap-[2px] px-2"
              >
                {levels.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Hör zu …</div>
                ) : (
                  levels.slice(-110).map((l, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-full bg-foreground/70"
                      style={{ height: `${Math.max(2, l * 100)}%`, opacity: 0.4 + l * 0.6 }}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer */}
          <AnimatePresence>
            {(isRecording || isPaused || phase === "review") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-2xl tabular-nums tracking-tight"
              >
                {formatDuration(duration)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hauptaktion */}
          {phase === "idle" && (
            <button
              onClick={start}
              className="group/rec relative size-28 rounded-full bg-foreground text-background shadow-xl flex items-center justify-center transition-transform active:scale-95 hover:scale-[1.02] focus-visible:ring-4 ring-amber/50 outline-none"
              aria-label="Aufnahme starten"
            >
              <Mic className="size-10" />
              <span className="absolute -bottom-9 text-sm text-foreground/70 group-hover/rec:text-foreground transition">
                Tippen zum Aufnehmen
              </span>
            </button>
          )}

          {phase === "permission" && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground text-sm">
              <Loader2 className="size-6 animate-spin" />
              Mikrofon wird angefragt …
            </div>
          )}

          {(isRecording || isPaused) && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="lg" onClick={isPaused ? resume : pause} className="rounded-full px-5 h-12">
                {isPaused ? <><Play className="size-4" /> Weiter</> : <><Pause className="size-4" /> Pause</>}
              </Button>
              <button
                onClick={stop}
                className={cn(
                  "size-20 rounded-full bg-destructive text-white shadow-lg flex items-center justify-center transition-transform active:scale-95",
                  isRecording && "pulse-ring",
                )}
                aria-label="Aufnahme beenden"
              >
                <Square className="size-7 fill-white" />
              </button>
              <Button variant="ghost" size="lg" onClick={() => { stop(); setTimeout(restart, 50) }} className="rounded-full px-5 h-12">
                Verwerfen
              </Button>
            </div>
          )}

          {phase === "review" && previewUrl && (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <audio src={previewUrl} controls className="w-full rounded-md" />
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={restart} className="rounded-full h-11 px-5">
                  <RefreshCw className="size-4" /> Nochmal
                </Button>
                <Button onClick={submit} className="rounded-full h-11 px-6 bg-foreground text-background">
                  Transkribieren
                </Button>
              </div>
            </div>
          )}

          {isBusy && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground text-sm">
              <Loader2 className="size-6 animate-spin" />
              {phase === "uploading" && "Transkription läuft …"}
              {phase === "structuring" && "Claude liest mit …"}
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 max-w-md text-center">
              <div className="text-destructive text-sm">{error}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={restart}>Erneut versuchen</Button>
                <Button variant="ghost" onClick={() => setTextMode(true)}>
                  <FileText className="size-4" /> Stattdessen schreiben
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text-Fallback */}
      {textMode && (
        <div className="w-full max-w-xl flex flex-col gap-3">
          <textarea
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Wofür bist du heute dankbar? Was war großartig? Wie war deine Stimmung (1–10)? Was hätte den Tag besser gemacht?"
            className="min-h-44 w-full resize-y rounded-2xl border bg-card p-4 text-[15px] leading-relaxed outline-none focus-visible:ring-2 ring-amber/50"
          />
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setTextMode(false)}>
              <Mic className="size-4" /> Zurück zur Aufnahme
            </Button>
            <Button onClick={submitText} className="bg-foreground text-background">
              Strukturieren
            </Button>
          </div>
        </div>
      )}

      {/* Optionen */}
      {!textMode && phase === "idle" && (
        <div className="flex items-center gap-3 mt-12 text-sm text-muted-foreground">
          <button onClick={() => setTextMode(true)} className="inline-flex items-center gap-1.5 hover:text-foreground transition">
            <FileText className="size-4" /> Lieber schreiben
          </button>
          {onCancel && (
            <>
              <span className="opacity-30">·</span>
              <button onClick={onCancel} className="inline-flex items-center gap-1.5 hover:text-foreground transition">
                <X className="size-4" /> Abbrechen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
