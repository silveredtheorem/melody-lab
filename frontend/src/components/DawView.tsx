import { useCallback, useEffect, useRef, useState } from 'react'
import { type ApiLayer, apiCreateCommit, apiGetCommit, apiGetPlaybackUrl } from '../lib/api'
import { connectSocket, joinProject, leaveProject } from '../lib/socket'
import { useToast } from './ToastProvider'
import './DawView.css'

// ─── Color ────────────────────────────────────────────

const INSTRUMENT_COLORS: Record<string, string> = {
  drums: '#e05c5c',
  percussion: '#e05c5c',
  bass: '#5c9ee0',
  guitar: '#5ce07a',
  piano: '#e0c45c',
  keys: '#e0c45c',
  keyboard: '#e0c45c',
  synth: '#c45ce0',
  vocals: '#5ce0d4',
  voice: '#5ce0d4',
  strings: '#e07a5c',
  brass: '#e09a5c',
  woodwind: '#a0e05c',
  pad: '#c45ce0',
}

function layerColor(instrument: string): string {
  const key = instrument.toLowerCase()
  for (const [k, v] of Object.entries(INSTRUMENT_COLORS)) {
    if (key.includes(k)) return v
  }
  let hash = 0
  for (const ch of instrument) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 55%)`
}

// ─── Icons ────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="3" width="4" height="18" rx="1" />
      <rect x="15" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.3" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.15" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function isGenerating(layer: ApiLayer): boolean {
  return !layer.s3Key || layer.durationMs === 0
}

// ─── DawView ──────────────────────────────────────────

interface DawViewProps {
  projectId: string
  branchId: string
  headCommitId: string
  onCommitCreated?: (commitId: string) => void
}

export function DawView({ projectId, branchId, headCommitId, onCommitCreated }: DawViewProps) {
  const { toast } = useToast()
  const [layers, setLayers] = useState<ApiLayer[]>([])
  const [loading, setLoading] = useState(true)
  const [buffersReady, setBuffersReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const startCtxTimeRef = useRef(0)
  const startOffsetRef = useRef(0)
  const rafRef = useRef(0)
  const layersRef = useRef<ApiLayer[]>([])
  const totalDurRef = useRef(0)
  const mutedRef = useRef<Set<string>>(new Set())

  function getCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  const loadLayers = useCallback(async (signal: AbortSignal) => {
    try {
      const commit = await apiGetCommit(projectId, headCommitId)
      if (signal.aborted) return
      const ls = commit.layers ?? []
      setLayers(ls)
      layersRef.current = ls

      const playable = ls.filter(l => !isGenerating(l))
      const dur = playable.length > 0
        ? Math.max(...playable.map(l => (l.startMs + l.durationMs) / 1000))
        : 0
      setTotalDuration(dur)
      totalDurRef.current = dur

      if (playable.length > 0) {
        const ctx = getCtx()
        await Promise.all(playable.map(async (layer) => {
          if (buffersRef.current.has(layer.id)) return
          try {
            const { url } = await apiGetPlaybackUrl(layer.s3Key)
            const res = await fetch(url, { signal })
            const ab = await res.arrayBuffer()
            const buf = await ctx.decodeAudioData(ab)
            if (signal.aborted) return
            buffersRef.current.set(layer.id, buf)
          } catch (e) {
            if (!signal.aborted) console.warn('layer load failed', layer.id, e)
          }
        }))
      }
      if (!signal.aborted) setBuffersReady(true)
    } catch (e) {
      if (!signal.aborted) console.error('DawView load error', e)
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [projectId, headCommitId])

  useEffect(() => {
    const controller = new AbortController()
    loadLayers(controller.signal)
    return () => controller.abort()
  }, [loadLayers])

  // Real-time socket events
  useEffect(() => {
    const socket = connectSocket()
    joinProject(projectId)

    function handleLayerAdded(layer: ApiLayer) {
      if (layer.commitId !== headCommitId) return
      setLayers(prev => {
        if (prev.some(l => l.id === layer.id)) return prev
        const next = [...prev, layer]
        layersRef.current = next
        return next
      })
    }

    function handleLayerUpdated(layer: ApiLayer) {
      setLayers(prev => {
        const idx = prev.findIndex(l => l.id === layer.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = layer
        layersRef.current = next

        const playable = next.filter(l => !isGenerating(l))
        const dur = playable.length > 0
          ? Math.max(...playable.map(l => (l.startMs + l.durationMs) / 1000))
          : 0
        setTotalDuration(dur)
        totalDurRef.current = dur

        if (!isGenerating(layer)) {
          const ctx = getCtx()
          apiGetPlaybackUrl(layer.s3Key)
            .then(({ url }) => fetch(url))
            .then(r => r.arrayBuffer())
            .then(ab => ctx.decodeAudioData(ab))
            .then(buf => {
              buffersRef.current.set(layer.id, buf)
              setBuffersReady(true)
            })
            .catch(e => console.warn('buffer load failed', layer.id, e))
        }

        return next
      })
    }

    socket.on('layer-added', handleLayerAdded)
    socket.on('layer-updated', handleLayerUpdated)

    return () => {
      leaveProject(projectId)
      socket.off('layer-added', handleLayerAdded)
      socket.off('layer-updated', handleLayerUpdated)
    }
  }, [projectId, headCommitId])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close()
  }, [])

  const stopAll = useCallback(() => {
    for (const s of sourcesRef.current) { try { s.stop() } catch {} }
    sourcesRef.current = []
    cancelAnimationFrame(rafRef.current)
  }, [])

  const playFrom = useCallback((offset: number) => {
    stopAll()
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    startCtxTimeRef.current = now
    startOffsetRef.current = offset

    for (const layer of layersRef.current) {
      if (isGenerating(layer)) continue
      if (mutedRef.current.has(layer.id)) continue
      const buf = buffersRef.current.get(layer.id)
      if (!buf) continue
      const layerStart = layer.startMs / 1000
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)

      if (offset < layerStart) {
        src.start(now + (layerStart - offset))
      } else {
        const inBuf = offset - layerStart
        if (inBuf < buf.duration) src.start(now, inBuf)
        else continue
      }
      sourcesRef.current.push(src)
    }

    setPlaying(true)

    function tick() {
      const elapsed = getCtx().currentTime - startCtxTimeRef.current
      const pos = Math.min(startOffsetRef.current + elapsed, totalDurRef.current)
      setCurrentTime(pos)
      if (pos < totalDurRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        stopAll()
        setPlaying(false)
        setCurrentTime(totalDurRef.current)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [stopAll])

  const handlePlayPause = useCallback(() => {
    if (playing) {
      stopAll()
      setPlaying(false)
    } else {
      playFrom(currentTime >= totalDuration ? 0 : currentTime)
    }
  }, [playing, currentTime, totalDuration, playFrom, stopAll])

  const handleStop = useCallback(() => {
    stopAll()
    setPlaying(false)
    setCurrentTime(0)
  }, [stopAll])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const pos = frac * totalDuration
    setCurrentTime(pos)
    if (playing) playFrom(pos)
  }, [playing, totalDuration, playFrom])

  function toggleMute(layerId: string) {
    setMutedIds(prev => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      mutedRef.current = next
      return next
    })
    if (playing) {
      playFrom(currentTime)
    }
  }

  async function handleDelete(layer: ApiLayer) {
    setDeletingId(layer.id)
    try {
      const remaining = layers.filter(l => l.id !== layer.id)
      const commit = await apiCreateCommit(
        projectId,
        branchId,
        `Remove ${layer.instrument} layer`,
        remaining.map(l => ({
          s3Key: l.s3Key,
          instrument: l.instrument,
          durationMs: l.durationMs,
          startMs: l.startMs,
          bpm: l.bpm ?? undefined,
          keySignature: l.keySignature ?? undefined,
          sourceType: l.sourceType,
        })),
      )
      toast.success(`${layer.instrument} removed`)
      onCommitCreated?.(commit.id)
    } catch {
      toast.error('failed to remove layer')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="daw daw--loading">
        <span className="daw-spinner" aria-label="loading audio" />
      </div>
    )
  }

  if (layers.length === 0) return null

  const pct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className="daw">
      {/* Transport bar */}
      <div className="daw-transport">
        <button
          className="daw-btn daw-btn--play"
          onClick={handlePlayPause}
          disabled={!buffersReady}
          aria-label={playing ? 'pause' : 'play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className="daw-btn"
          onClick={handleStop}
          disabled={!buffersReady}
          aria-label="stop"
        >
          <StopIcon />
        </button>
        <span className="daw-time">
          <span className="daw-time-cur">{fmt(currentTime)}</span>
          <span className="daw-time-sep">/</span>
          <span className="daw-time-tot">{fmt(totalDuration)}</span>
        </span>
        {!buffersReady && <span className="daw-loading-label">loading audio…</span>}
      </div>

      {/* Track area */}
      <div className="daw-body">
        {/* Labels column */}
        <div className="daw-labels">
          {layers.map(layer => {
            const muted = mutedIds.has(layer.id)
            const generating = isGenerating(layer)
            return (
              <div key={layer.id} className={`daw-label${muted ? ' daw-label--muted' : ''}`}>
                <button
                  className={`daw-mute-btn${muted ? ' is-muted' : ''}`}
                  onClick={() => toggleMute(layer.id)}
                  aria-label={muted ? `unmute ${layer.instrument}` : `mute ${layer.instrument}`}
                  disabled={generating}
                >
                  {muted ? <MuteIcon /> : <VolumeIcon />}
                </button>
                <span className="daw-label-dot" style={{ background: muted ? 'var(--border)' : layerColor(layer.instrument) }} />
                <span className="daw-label-name">{layer.instrument}</span>
                {layer.sourceType === 'AI_GENERATED' && (
                  <span className="daw-ai-badge">AI</span>
                )}
                {generating && (
                  <span className="daw-generating-badge">generating…</span>
                )}
                {!generating && (
                  <button
                    className="daw-delete-btn"
                    onClick={() => handleDelete(layer)}
                    disabled={deletingId === layer.id}
                    aria-label={`delete ${layer.instrument}`}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Timeline + tracks */}
        <div className="daw-timeline-wrap" onClick={handleSeek} role="slider" aria-label="seek" aria-valuenow={Math.round(currentTime)} aria-valuemin={0} aria-valuemax={Math.round(totalDuration)}>
          {/* Playhead */}
          <div className="daw-playhead" style={{ left: `${pct}%` }} />

          {/* Rows */}
          {layers.map(layer => {
            const generating = isGenerating(layer)
            const muted = mutedIds.has(layer.id)
            const left = totalDuration > 0 && !generating ? (layer.startMs / 1000 / totalDuration) * 100 : 0
            const width = totalDuration > 0 && !generating ? (layer.durationMs / 1000 / totalDuration) * 100 : 100
            const color = layerColor(layer.instrument)
            return (
              <div key={layer.id} className={`daw-track-row${muted ? ' daw-track-row--muted' : ''}`}>
                <div
                  className={`daw-track-bar${generating ? ' daw-track-bar--generating' : ''}${muted ? ' daw-track-bar--muted' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    '--track-color': color,
                  } as React.CSSProperties}
                />
              </div>
            )
          })}

          {/* Time ruler ticks */}
          {totalDuration > 0 && (
            <div className="daw-ruler" aria-hidden="true">
              {Array.from({ length: Math.ceil(totalDuration / 4) + 1 }, (_, i) => {
                const t = i * 4
                if (t > totalDuration) return null
                const left = (t / totalDuration) * 100
                return (
                  <span key={t} className="daw-ruler-tick" style={{ left: `${left}%` }}>
                    {fmt(t)}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
