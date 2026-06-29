import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppShell } from '../components/AppShellContext'
import { useToast } from '../components/ToastProvider'
import { EmptyState } from '../components/EmptyState'
import {
  ApiError,
  type ApiCommit,
  apiCreateCommit,
  apiCreateMergeRequest,
  apiDeleteBranch,
  apiGetCommitHistory,
  apiGetProject,
  apiGetUploadUrl,
  apiRequestAIGeneration,
} from '../lib/api'
import { DawView } from '../components/DawView'
import { connectSocket, joinProject, leaveProject } from '../lib/socket'
import { initials, relativeTime, shortId } from '../lib/utils'
import './DashboardPage.css'
import './BranchViewPage.css'

// ─── Types ────────────────────────────────────────

interface Commit {
  sha: string
  message: string
  authorName: string
  authorInitials: string
  createdAt: string
}

interface BranchMeta {
  id: string
  name: string
  isDefault: boolean
  commitCount: number
  updatedAt: string
}

// ─── Data mapping ─────────────────────────────────

function toCommit(c: ApiCommit): Commit {
  const name = c.author?.name ?? 'unknown'
  return {
    sha: c.id,
    message: c.message,
    authorName: name,
    authorInitials: initials(name),
    createdAt: relativeTime(c.createdAt),
  }
}

// ─── Icons ────────────────────────────────────────

function BranchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function MergeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6"  cy="6"  r="3" />
      <circle cx="6"  cy="18" r="3" />
      <circle cx="18" cy="6"  r="3" />
      <path d="M6 9v5.5A2.5 2.5 0 0 0 8.5 17h7" />
    </svg>
  )
}

function CommitDotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.35" />
      <line x1="12" y1="3"  x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ─── Commit row ───────────────────────────────────

function CommitRow({ commit, index, projectId, branchId }: {
  commit: Commit; index: number; projectId: string; branchId: string
}) {
  const commitPath = `/projects/${projectId}/branches/${branchId}/commits/${commit.sha}`

  return (
    <li
      className="commit-row"
      style={{ '--row-index': index } as React.CSSProperties}
    >
      <div className="commit-row-sha-col">
        <code className="commit-sha">{shortId(commit.sha)}</code>
      </div>

      <div className="commit-row-msg-col">
        <Link to={commitPath} className="commit-message-link">
          {commit.message}
        </Link>
      </div>

      <div className="commit-row-right">
        <span className="commit-avatar" aria-hidden="true">{commit.authorInitials}</span>
        <span className="commit-author">{commit.authorName}</span>
        <span className="commit-time">{commit.createdAt}</span>
      </div>
    </li>
  )
}

// ─── Upload layer modal ──────────────────────────

interface UploadModalProps {
  onClose: () => void
  onUpload: (file: File, instrument: string) => Promise<void>
}

function UploadLayerModal({ onClose, onUpload }: UploadModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [instrument, setInstrument] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const instrumentId = useId()

  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    function handleClose() { onCloseRef.current() }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('select a WAV file'); return }
    if (!instrument.trim()) { setError('name the instrument'); return }
    setError('')
    setLoading(true)
    try {
      await onUpload(file, instrument.trim())
      dialogRef.current?.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="upload-modal-title">
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <h2 id="upload-modal-title" className="modal-title">add a layer</h2>

        <div className="modal-fields">
          <div className="modal-field">
            <label className="modal-label">audio file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/wav,audio/mpeg,.wav,.mp3"
              className="modal-file-input"
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !instrument) {
                  const name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
                  setInstrument(name)
                }
              }}
              disabled={loading}
            />
            {!file && (
              <button
                type="button"
                className="modal-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <UploadIcon /> choose audio file
              </button>
            )}
            {file && (
              <div className="modal-file-chosen">
                <span className="modal-file-name">{file.name}</span>
                <button
                  type="button"
                  className="modal-file-remove"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor={instrumentId} className="modal-label">instrument</label>
            <input
              id={instrumentId}
              type="text"
              className="modal-input"
              placeholder="drums, bass, vocals…"
              value={instrument}
              onChange={e => setInstrument(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
          >
            cancel
          </button>
          <button type="submit" className="modal-btn-primary" disabled={loading}>
            {loading && <span className="modal-spinner" aria-hidden="true" />}
            {loading ? 'uploading…' : 'upload & commit'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// ─── AI generation modal ─────────────────────────

interface AIModalProps {
  onClose: () => void
  onGenerate: (instrument: string, prompt: string) => Promise<void>
}

function AIGenerateModal({ onClose, onGenerate }: AIModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [instrument, setInstrument] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const instrumentId = useId()
  const promptId = useId()

  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    function handleClose() { onCloseRef.current() }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instrument.trim()) { setError('name the instrument'); return }
    if (!prompt.trim()) { setError('describe what you want'); return }
    setError('')
    setLoading(true)
    try {
      await onGenerate(instrument.trim(), prompt.trim())
      dialogRef.current?.close()
    } catch {
      setError('generation request failed — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="ai-modal-title">
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <h2 id="ai-modal-title" className="modal-title">generate AI layer</h2>

        <div className="modal-fields">
          <div className="modal-field">
            <label htmlFor={instrumentId} className="modal-label">instrument</label>
            <input
              id={instrumentId}
              type="text"
              className="modal-input"
              placeholder="synth, pad, drums…"
              value={instrument}
              onChange={e => setInstrument(e.target.value)}
              autoFocus
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div className="modal-field">
            <label htmlFor={promptId} className="modal-label">describe the sound</label>
            <textarea
              id={promptId}
              className="modal-textarea"
              placeholder="ambient pad, warm and dreamy, 120 BPM…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        {error && <p className="modal-error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
          >
            cancel
          </button>
          <button type="submit" className="modal-btn-primary" disabled={loading}>
            {loading && <span className="modal-spinner" aria-hidden="true" />}
            {loading ? 'requesting…' : 'generate'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// ─── WAV duration helper ─────────────────────────

async function getWavDurationMs(file: File): Promise<number> {
  const ctx = new AudioContext()
  try {
    const ab = await file.arrayBuffer()
    const buf = await ctx.decodeAudioData(ab)
    return Math.round(buf.duration * 1000)
  } finally {
    ctx.close()
  }
}

// ─── Branch view page ─────────────────────────────

export function BranchViewPage() {
  const { projectId, branchId } = useParams<{ projectId: string; branchId: string }>()
  const { setBreadcrumb } = useAppShell()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [branch, setBranchMeta] = useState<BranchMeta | null>(null)
  const [headCommitId, setHeadCommitId] = useState<string | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [projectName, setProjectName] = useState('')
  const [mainBranchId, setMainBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openingMR, setOpeningMR] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [aiOpen, setAIOpen] = useState(false)

  const applyData = useCallback((project: Awaited<ReturnType<typeof apiGetProject>>, history: ApiCommit[]) => {
    const branchData = project.branches.find(b => b.id === branchId)
    if (!branchData) { setNotFound(true); return }

    setProjectName(project.name)
    setMainBranchId(project.branches.find(b => b.name === 'main')?.id ?? null)
    setHeadCommitId(branchData.headCommitId ?? null)
    setCommits(history.map(toCommit))

    const lastAt = history[0]?.createdAt ?? branchData.createdAt
    setBranchMeta({
      id: branchData.id,
      name: branchData.name,
      isDefault: branchData.name === 'main',
      commitCount: history.length,
      updatedAt: relativeTime(lastAt),
    })
  }, [branchId])

  const refreshData = useCallback(async () => {
    if (!projectId || !branchId) return
    try {
      const [project, history] = await Promise.all([
        apiGetProject(projectId),
        apiGetCommitHistory(projectId, branchId),
      ])
      applyData(project, history)
    } catch (e) {
      console.warn('refresh failed', e)
    }
  }, [projectId, branchId, applyData])

  useEffect(() => {
    if (!projectId || !branchId) return
    let cancelled = false
    Promise.all([
      apiGetProject(projectId),
      apiGetCommitHistory(projectId, branchId),
    ])
      .then(([project, history]) => { if (!cancelled) applyData(project, history) })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId, branchId, applyData])

  // Set breadcrumb
  useEffect(() => {
    if (!projectName || !branch) return
    setBreadcrumb(
      <>
        <Link to={`/projects/${projectId}`} className="topbar-crumb-link">
          {projectName}
        </Link>
        <span className="topbar-crumb-sep" aria-hidden="true">/</span>
        <span className="topbar-crumb-current">{branch.name}</span>
      </>
    )
    return () => setBreadcrumb(null)
  }, [setBreadcrumb, projectId, projectName, branch])

  // Socket: real-time commits
  useEffect(() => {
    if (!projectId) return
    const socket = connectSocket()
    joinProject(projectId)

    socket.on('commit-created', () => { refreshData() })

    return () => {
      leaveProject(projectId)
      socket.off('commit-created')
    }
  }, [projectId, refreshData])

  async function handleOpenMR() {
    if (!projectId || !branchId || !mainBranchId) return
    setOpeningMR(true)
    try {
      const mr = await apiCreateMergeRequest(projectId, branchId, mainBranchId)
      navigate(`/projects/${projectId}/merge-requests/${mr.id}`)
    } catch {
      toast.error('failed to open merge request')
      setOpeningMR(false)
    }
  }

  async function handleDeleteBranch() {
    if (!projectId || !branchId) return
    try {
      await apiDeleteBranch(projectId, branchId)
      toast.success('branch deleted')
      navigate(`/projects/${projectId}`, { replace: true })
    } catch {
      toast.error('failed to delete branch')
    }
  }

  async function handleUpload(file: File, instrument: string) {
    if (!projectId || !branchId) return
    const durationMs = await getWavDurationMs(file)
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : (file.type === 'audio/mpeg' ? 'mp3' : 'wav')
    const s3Key = `projects/${projectId}/${crypto.randomUUID()}.${ext}`
    const { signedUrl } = await apiGetUploadUrl(s3Key)
    await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })
    try {
      const commit = await apiCreateCommit(projectId, branchId, `Add ${instrument} layer`, [
        { s3Key, instrument, durationMs, startMs: 0, sourceType: 'HUMAN' },
      ])
      setHeadCommitId(commit.id)
      toast.success(`${instrument} layer added`)
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === 'DUPLICATE_INSTRUMENT') {
        const name = (err.body as Record<string, string>).instrument ?? instrument
        throw new Error(`A ${name} layer already exists. Create a new branch to add an alternate version.`, { cause: err })
      }
      throw err
    }
    refreshData()
  }

  async function handleAIGenerate(instrument: string, prompt: string) {
    if (!projectId || !branchId) return
    await apiRequestAIGeneration(projectId, branchId, instrument, prompt)
    toast.success(`generating ${instrument}…`)
  }

  if (loading) {
    return (
      <div className="branch-view">
        <div className="branch-view-container">
          <div className="page-loading" aria-label="loading" />
        </div>
      </div>
    )
  }

  if (notFound || !branch) {
    return (
      <div className="branch-view">
        <EmptyState
          size="page"
          title="branch not found"
          body="this branch doesn't exist or you don't have access"
          action={
            <Link to={`/projects/${projectId}`} className="empty-state-back-link">
              ← back to project
            </Link>
          }
        />
      </div>
    )
  }

  const commitLabel = branch.commitCount === 1 ? '1 commit' : `${branch.commitCount} commits`

  return (
    <div className="branch-view">
      <div className="branch-view-container">

        <header className="branch-view-header">
          <div className="branch-view-header-left">
            <h1 className="branch-view-name">
              <span className="branch-view-name-icon"><BranchIcon /></span>
              {branch.name}
              {branch.isDefault && (
                <span className="branch-view-default-pill">default</span>
              )}
            </h1>
            <p className="branch-view-meta">
              <span>{commitLabel}</span>
              <span className="branch-view-meta-dot" aria-hidden="true">·</span>
              <span>updated {branch.updatedAt}</span>
            </p>
          </div>

          <div className="branch-view-actions">
            {headCommitId && (
              <button className="btn-add-layer" onClick={() => setAIOpen(true)}>
                <SparkleIcon />
                AI generate
              </button>
            )}
            <button className="btn-add-layer" onClick={() => setUploadOpen(true)}>
              <UploadIcon />
              add layer
            </button>
            {!branch.isDefault && mainBranchId && (
              <button
                className="btn-open-mr"
                onClick={handleOpenMR}
                disabled={openingMR}
              >
                {openingMR
                  ? <><span className="btn-spinner" aria-hidden="true" />opening…</>
                  : <><MergeIcon />open merge request</>
                }
              </button>
            )}
            {!branch.isDefault && (
              <button
                className="btn-delete-branch"
                onClick={handleDeleteBranch}
                aria-label="delete branch"
              >
                delete
              </button>
            )}
          </div>
        </header>

        {headCommitId && (
          <DawView
            projectId={projectId!}
            branchId={branchId!}
            headCommitId={headCommitId}
            onCommitCreated={(commitId) => {
              setHeadCommitId(commitId)
              refreshData()
            }}
          />
        )}

        {!headCommitId && commits.length === 0 && (
          <div className="branch-empty-daw">
            <EmptyState
              icon={<PlusIcon />}
              title="no layers yet"
              body="upload an audio file to create your first commit"
              action={
                <button className="empty-state-cta" onClick={() => setUploadOpen(true)}>
                  <UploadIcon /> add a layer
                </button>
              }
            />
          </div>
        )}

        {commits.length > 0 ? (
          <ul className="commit-list" aria-label="commits">
            {commits.map((commit, i) => (
              <CommitRow
                key={commit.sha}
                commit={commit}
                index={i}
                projectId={projectId!}
                branchId={branchId!}
              />
            ))}
          </ul>
        ) : headCommitId ? (
          <EmptyState
            icon={<CommitDotIcon />}
            title="no commits yet"
            body="changes pushed to this branch will appear here"
          />
        ) : null}

      </div>

      {uploadOpen && (
        <UploadLayerModal
          onClose={() => setUploadOpen(false)}
          onUpload={handleUpload}
        />
      )}

      {aiOpen && (
        <AIGenerateModal
          onClose={() => setAIOpen(false)}
          onGenerate={handleAIGenerate}
        />
      )}
    </div>
  )
}
