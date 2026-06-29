import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppShell } from '../components/AppShellContext'
import { useToast } from '../components/ToastProvider'
import { EmptyState } from '../components/EmptyState'
import {
  type ApiConflict,
  type ApiMergeRequest,
  apiCompleteMerge,
  apiGetMergeRequest,
  apiGetProject,
  apiResolveConflict,
} from '../lib/api'
import { formatMs, relativeTime } from '../lib/utils'
import './MergeRequestPage.css'

// ─── Icons ────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6"  cy="6"  r="3" />
      <circle cx="6"  cy="18" r="3" />
      <circle cx="18" cy="6"  r="3" />
      <path d="M6 9v5.5A2.5 2.5 0 0 0 8.5 17h7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Status badge ─────────────────────────────────

type UIStatus = 'open' | 'merged' | 'closed'

function toUIStatus(s: ApiMergeRequest['status']): UIStatus {
  if (s === 'RESOLVED') return 'merged'
  if (s === 'CANCELLED') return 'closed'
  return 'open'
}

function StatusBadge({ status }: { status: UIStatus }) {
  return (
    <span className={`mr-status-badge mr-status-${status}`}>
      {status === 'merged' && <CheckIcon />}
      {status}
    </span>
  )
}

// ─── Layer detail ─────────────────────────────────

function LayerDetail({ layer }: { layer: ApiConflict['ourLayer'] }) {
  const parts: string[] = []
  if (layer.durationMs) parts.push(formatMs(layer.durationMs))
  if (layer.bpm) parts.push(`${layer.bpm} BPM`)
  if (layer.keySignature) parts.push(layer.keySignature)
  const meta = parts.join('  ·  ')
  const filename = layer.s3Key.split('/').pop() ?? layer.instrument

  return (
    <div className="mr-layer-detail">
      <code className="mr-layer-path">{filename}</code>
      {meta && <span className="mr-layer-meta">{meta}</span>}
    </div>
  )
}

// ─── Conflict row ─────────────────────────────────

type Resolution = 'OURS' | 'THEIRS' | 'BOTH'

function ConflictRow({
  conflict,
  sourceBranchName,
  targetBranchName,
  onResolve,
  saving,
}: {
  conflict: ApiConflict
  sourceBranchName: string
  targetBranchName: string
  onResolve: (id: string, r: Resolution) => void
  saving: boolean
}) {
  const resolved = conflict.resolution

  return (
    <li className="mr-conflict-row">
      <div className="mr-conflict-header">
        <span className="mr-conflict-instrument">{conflict.instrument}</span>
        {resolved && (
          <span className="mr-conflict-resolved-badge">
            <CheckIcon />
            {resolved.toLowerCase()}
          </span>
        )}
      </div>

      <div className="mr-conflict-sides">
        <div className="mr-conflict-side">
          <span className="mr-conflict-side-label">{targetBranchName} (ours)</span>
          <LayerDetail layer={conflict.ourLayer} />
        </div>
        <div className="mr-conflict-side">
          <span className="mr-conflict-side-label">{sourceBranchName} (theirs)</span>
          <LayerDetail layer={conflict.theirLayer} />
        </div>
      </div>

      <div className="mr-conflict-actions">
        {(['OURS', 'BOTH', 'THEIRS'] as const).map(r => (
          <button
            key={r}
            className={`mr-conflict-btn${resolved === r ? ' is-active' : ''}`}
            onClick={() => onResolve(conflict.id, r)}
            disabled={saving}
          >
            {r === 'OURS' ? 'keep ours' : r === 'THEIRS' ? 'keep theirs' : 'keep both'}
          </button>
        ))}
      </div>
    </li>
  )
}

// ─── MR view ─────────────────────────────────────

function MRView({
  initial,
  projectId,
  projectName,
}: {
  initial: ApiMergeRequest
  projectId: string
  projectName: string
}) {
  const { setBreadcrumb } = useAppShell()
  const { toast } = useToast()
  const [mr, setMR] = useState(initial)
  const [merging, setMerging] = useState(false)
  const [savingConflict, setSavingConflict] = useState(false)

  const status = toUIStatus(mr.status)
  const title = `merge ${mr.sourceBranch.name} into ${mr.targetBranch.name}`
  const unresolvedCount = mr.conflicts.filter(c => c.resolution === null).length
  const canMerge = mr.status === 'OPEN' && unresolvedCount === 0

  useEffect(() => {
    setBreadcrumb(
      <>
        <Link to={`/projects/${projectId}`} className="topbar-crumb-link">
          {projectName}
        </Link>
        <span className="topbar-crumb-sep" aria-hidden="true">/</span>
        <span className="topbar-crumb-current">merge request</span>
      </>
    )
    return () => setBreadcrumb(null)
  }, [setBreadcrumb, projectId, projectName])

  async function handleResolve(conflictId: string, resolution: Resolution) {
    setSavingConflict(true)
    try {
      const updated = await apiResolveConflict(projectId, mr.id, conflictId, resolution)
      setMR(prev => ({
        ...prev,
        conflicts: prev.conflicts.map(c => c.id === conflictId ? { ...c, ...updated } : c),
      }))
    } catch {
      toast.error('failed to save resolution')
    } finally {
      setSavingConflict(false)
    }
  }

  async function handleMerge() {
    setMerging(true)
    try {
      await apiCompleteMerge(projectId, mr.id)
      setMR(prev => ({ ...prev, status: 'RESOLVED' }))
      toast.success(`${mr.sourceBranch.name} merged into ${mr.targetBranch.name}`)
    } catch (err: any) {
      const msg = err?.body?.error === 'UNRESOLVED_CONFLICTS'
        ? 'resolve all conflicts before merging'
        : 'merge failed — try again'
      toast.error(msg)
    } finally {
      setMerging(false)
    }
  }

  function handleClose() {
    setMR(prev => ({ ...prev, status: 'CANCELLED' }))
  }

  function handleReopen() {
    setMR(prev => ({ ...prev, status: 'OPEN' }))
  }

  return (
    <div className="mr-page">
      <div className="mr-container">

        {/* ── Header ── */}
        <header className="mr-header">
          <div className="mr-header-title-row">
            <h1 className="mr-title">{title}</h1>
            <StatusBadge status={status} />
          </div>

          <div className="mr-header-meta-row">
            <span className="mr-branch-arrow" aria-label={`${mr.sourceBranch.name} into ${mr.targetBranch.name}`}>
              <code className="mr-branch-name mr-branch-source">{mr.sourceBranch.name}</code>
              <span className="mr-branch-arr" aria-hidden="true"><ArrowRightIcon /></span>
              <code className="mr-branch-name mr-branch-target">{mr.targetBranch.name}</code>
            </span>
            <span className="mr-meta-dot" aria-hidden="true">·</span>
            <span className="mr-meta-time">opened {relativeTime(mr.createdAt)}</span>
            {mr.conflicts.length > 0 && (
              <>
                <span className="mr-meta-dot" aria-hidden="true">·</span>
                <span className="mr-meta-stat">
                  {unresolvedCount > 0
                    ? `${unresolvedCount} conflict${unresolvedCount !== 1 ? 's' : ''} to resolve`
                    : 'all conflicts resolved'
                  }
                </span>
              </>
            )}
          </div>

          <div className="mr-header-actions">
            {status === 'open' && (
              <>
                <button
                  className="btn-merge"
                  onClick={handleMerge}
                  disabled={merging || !canMerge}
                  title={!canMerge && unresolvedCount > 0 ? 'resolve all conflicts first' : undefined}
                >
                  {merging
                    ? <><span className="btn-spinner" aria-hidden="true" />merging…</>
                    : <><MergeIcon />merge</>
                  }
                </button>
                <button className="btn-close-mr" onClick={handleClose}>close</button>
              </>
            )}
            {status === 'merged' && (
              <div className="mr-merged-note">
                <CheckIcon />
                merged — changes are now in <code>{mr.targetBranch.name}</code>
              </div>
            )}
            {status === 'closed' && (
              <button className="btn-reopen-mr" onClick={handleReopen}>reopen</button>
            )}
          </div>
        </header>

        {/* ── Conflicts ── */}
        {mr.conflicts.length > 0 && (
          <section className="mr-section" aria-labelledby="mr-conflicts-label">
            <h2 id="mr-conflicts-label" className="mr-section-label">
              conflicts <span className="mr-section-count">({mr.conflicts.length})</span>
            </h2>
            <ul className="mr-conflicts-list">
              {mr.conflicts.map(c => (
                <ConflictRow
                  key={c.id}
                  conflict={c}
                  sourceBranchName={mr.sourceBranch.name}
                  targetBranchName={mr.targetBranch.name}
                  onResolve={handleResolve}
                  saving={savingConflict}
                />
              ))}
            </ul>
          </section>
        )}

        {mr.conflicts.length === 0 && status === 'open' && (
          <section className="mr-section">
            <p className="mr-no-conflicts">no conflicts — this merge is clean and ready to complete.</p>
          </section>
        )}

      </div>
    </div>
  )
}

// ─── Merge request page ───────────────────────────

export function MergeRequestPage() {
  const { projectId, mrId } = useParams<{ projectId: string; mrId: string }>()
  const { setBreadcrumb } = useAppShell()
  const [mr, setMR] = useState<ApiMergeRequest | null>(null)
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!projectId || !mrId) return
    try {
      const [data, project] = await Promise.all([
        apiGetMergeRequest(projectId, mrId),
        apiGetProject(projectId),
      ])
      setMR(data)
      setProjectName(project.name)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [projectId, mrId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (mr) return
    setBreadcrumb(null)
  }, [mr, setBreadcrumb])

  if (loading) {
    return (
      <div className="mr-page">
        <div className="mr-container">
          <div className="page-loading" aria-label="loading" />
        </div>
      </div>
    )
  }

  if (notFound || !mr) {
    return (
      <div className="mr-page">
        <EmptyState
          size="page"
          title="merge request not found"
          body="this MR doesn't exist or you don't have access"
          action={
            <Link to={`/projects/${projectId}`} className="empty-state-back-link">
              ← back to project
            </Link>
          }
        />
      </div>
    )
  }

  return <MRView initial={mr} projectId={projectId!} projectName={projectName} />
}
