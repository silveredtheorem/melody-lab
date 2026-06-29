import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppShell } from '../components/AppShellContext'
import { EmptyState } from '../components/EmptyState'
import { type ApiCommitWithLayers, type ApiLayer, apiGetCommit, apiGetProject } from '../lib/api'
import { formatMs, initials, relativeTime, shortId } from '../lib/utils'
import './CommitDetailPage.css'

// ─── Types ────────────────────────────────────────

type LayerChange = 'added' | 'modified' | 'removed'
type LayerType = 'audio' | 'midi' | 'arrangement' | 'mix'

interface LayerDiff {
  id: string
  filename: string
  type: LayerType
  change: LayerChange
  duration?: string
  bpm?: number
  key?: string
}

// ─── Data mapping ─────────────────────────────────

function layerType(layer: ApiLayer): LayerType {
  const ext = layer.s3Key.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'mid' || ext === 'midi') return 'midi'
  if (ext === 'xml') return 'arrangement'
  if (ext === 'json') return 'mix'
  return 'audio'
}

function toLayerDiff(layer: ApiLayer): LayerDiff {
  const filename = layer.s3Key.split('/').pop() ?? layer.instrument
  return {
    id: layer.id,
    filename,
    type: layerType(layer),
    change: 'added',
    duration: layer.durationMs > 0 ? formatMs(layer.durationMs) : undefined,
    bpm: layer.bpm ?? undefined,
    key: layer.keySignature ?? undefined,
  }
}

// ─── Waveform ─────────────────────────────────────

function seededHeights(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  }
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0
    out.push(10 + (Math.abs(h) % 80))
  }
  return out
}

const BAR_COUNT = 52

function Waveform({ seed, variant }: { seed: string; variant: 'success' | 'accent' | 'muted' }) {
  const heights = seededHeights(seed, BAR_COUNT)
  return (
    <div className={`waveform waveform-${variant}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="waveform-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  )
}

// ─── Layer item ───────────────────────────────────

const CHANGE_GLYPH: Record<LayerChange, string> = { added: '+', modified: '~', removed: '−' }
const WAVEFORM_TYPES = new Set<LayerType>(['audio', 'midi'])

function formatMeta(layer: LayerDiff): string {
  const parts: string[] = []
  if (layer.duration)  parts.push(layer.duration)
  if (layer.bpm)       parts.push(`${layer.bpm} BPM`)
  if (layer.key)       parts.push(layer.key)
  return parts.join('  ·  ')
}

function LayerItem({ layer, index }: { layer: LayerDiff; index: number }) {
  const hasWaveform = WAVEFORM_TYPES.has(layer.type)
  const meta = formatMeta(layer)

  return (
    <li
      className={`commit-layer-item commit-layer-${layer.change}`}
      style={{ '--layer-index': index } as React.CSSProperties}
    >
      <div className="commit-layer-header">
        <span className={`commit-layer-indicator commit-layer-ind-${layer.change}`} aria-label={layer.change}>
          {CHANGE_GLYPH[layer.change]}
        </span>
        <code className="commit-layer-filename">{layer.filename}</code>
        <span className="commit-layer-type-badge">{layer.type}</span>
        {meta && <span className="commit-layer-meta">{meta}</span>}
      </div>

      {hasWaveform && (
        <div className="commit-layer-viz">
          <Waveform seed={layer.filename} variant="success" />
        </div>
      )}
    </li>
  )
}

// ─── Commit detail page ───────────────────────────

export function CommitDetailPage() {
  const { projectId, branchId, commitId } = useParams<{
    projectId: string
    branchId: string
    commitId: string
  }>()
  const { setBreadcrumb } = useAppShell()

  const [commit, setCommit] = useState<ApiCommitWithLayers | null>(null)
  const [projectName, setProjectName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!projectId || !commitId) return
    let cancelled = false

    Promise.all([
      apiGetProject(projectId),
      apiGetCommit(projectId, commitId),
    ])
      .then(([project, commitData]) => {
        if (cancelled) return
        setProjectName(project.name)
        const branch = project.branches.find(b => b.id === branchId)
        setBranchName(branch?.name ?? shortId(branchId ?? ''))
        setCommit(commitData)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [projectId, branchId, commitId])

  useEffect(() => {
    if (!projectName || !branchId || !commitId) return
    setBreadcrumb(
      <>
        <Link to={`/projects/${projectId}`} className="topbar-crumb-link">
          {projectName}
        </Link>
        <span className="topbar-crumb-sep" aria-hidden="true">/</span>
        <Link to={`/projects/${projectId}/branches/${branchId}`} className="topbar-crumb-link">
          {branchName}
        </Link>
        <span className="topbar-crumb-sep" aria-hidden="true">/</span>
        <span className="topbar-crumb-current topbar-crumb-sha">{shortId(commitId ?? '')}</span>
      </>
    )
    return () => setBreadcrumb(null)
  }, [setBreadcrumb, projectId, branchId, commitId, projectName, branchName])

  if (loading) {
    return (
      <div className="commit-detail-page">
        <div className="commit-detail-container">
          <div className="page-loading" aria-label="loading" />
        </div>
      </div>
    )
  }

  if (notFound || !commit) {
    return (
      <div className="commit-detail-page">
        <EmptyState
          size="page"
          title={shortId(commitId ?? 'commit')}
          body="commit not found or you don't have access"
          action={
            <Link to={`/projects/${projectId}/branches/${branchId}`} className="empty-state-back-link">
              ← back to branch
            </Link>
          }
        />
      </div>
    )
  }

  const authorName = commit.author?.name ?? 'unknown'
  const authorInitials = initials(authorName)
  const layers = commit.layers.map(toLayerDiff)
  const parentPath = commit.parentId
    ? `/projects/${projectId}/branches/${branchId}/commits/${commit.parentId}`
    : null

  return (
    <div className="commit-detail-page">
      <div className="commit-detail-container">

        {/* ── Navigation strip ── */}
        <nav className="commit-nav" aria-label="commit navigation">
          <div className="commit-nav-left">
            {parentPath ? (
              <Link to={parentPath} className="commit-nav-prev">
                <ArrowLeftIcon />
                <code>{shortId(commit.parentId!)}</code>
              </Link>
            ) : (
              <span className="commit-nav-first">first commit on this branch</span>
            )}
          </div>
          <span className="commit-nav-position">
            on <code>{branchName}</code>
          </span>
        </nav>

        {/* ── Commit header ── */}
        <header className="commit-header">
          <h1 className="commit-message-heading">{commit.message}</h1>
          <div className="commit-header-meta">
            <span className="commit-author-cluster">
              <span className="commit-author-avatar" aria-hidden="true">{authorInitials}</span>
              <span className="commit-author-name">{authorName}</span>
            </span>
            <span className="commit-meta-dot" aria-hidden="true">·</span>
            <span className="commit-timestamp">{relativeTime(commit.createdAt)}</span>
            <span className="commit-meta-dot" aria-hidden="true">·</span>
            <code
              className="commit-full-sha"
              title="commit ID"
              aria-label={`commit ID: ${commit.id}`}
            >
              {commit.id}
            </code>
          </div>
        </header>

        {/* ── Layer list ── */}
        {layers.length > 0 ? (
          <ul className="commit-layers-list" aria-label="changed layers">
            {layers.map((layer, i) => (
              <LayerItem key={layer.id} layer={layer} index={i} />
            ))}
          </ul>
        ) : (
          <div className="commit-layers-list">
            <EmptyState
              title="no layer changes in this commit"
              body="this commit modified project settings or metadata"
            />
          </div>
        )}

      </div>
    </div>
  )
}
