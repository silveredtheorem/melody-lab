import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { type ApiProject, apiCreateProject, apiListProjects } from '../lib/api'
import { initials, relativeTime } from '../lib/utils'
import './DashboardPage.css'

// ─── Types ────────────────────────────────────────

interface Member {
  id: string
  name: string
  initials: string
}

interface Project {
  id: string
  name: string
  activeBranch: string
  members: Member[]
  updatedAt: string
  visibility: 'private'
}

// ─── Data mapping ─────────────────────────────────

function toProject(p: ApiProject): Project {
  const mainBranch = p.branches.find(b => b.name === 'main') ?? p.branches[0]
  return {
    id: p.id,
    name: p.name,
    activeBranch: mainBranch?.name ?? 'main',
    members: p.members.map(m => ({
      id: m.userId,
      name: m.user.name,
      initials: initials(m.user.name),
    })),
    updatedAt: relativeTime(p.createdAt),
    visibility: 'private',
  }
}

// ─── Icons ────────────────────────────────────────

function BranchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ─── Avatar stack ─────────────────────────────────

function AvatarStack({ members }: { members: Member[] }) {
  const MAX = 4
  const shown = members.slice(0, MAX)
  const overflow = members.length - MAX

  return (
    <div
      className="avatar-stack"
      aria-label={`${members.length} member${members.length !== 1 ? 's' : ''}`}
    >
      {shown.map((m, i) => (
        <span
          key={m.id}
          className="avatar-stack-item"
          style={{ zIndex: MAX - i }}
          title={m.name}
        >
          {m.initials}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="avatar-stack-item avatar-stack-overflow"
          style={{ zIndex: 0 }}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

// ─── Project card ─────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="project-card"
      aria-label={`Open ${project.name}`}
    >
      <div className="project-card-top">
        <h2 className="project-card-name">{project.name}</h2>
        <div className="project-card-branch">
          <BranchIcon />
          <span>{project.activeBranch}</span>
        </div>
      </div>

      <div className="project-card-bottom">
        <AvatarStack members={project.members} />
        <div className="project-card-meta">
          {project.visibility === 'private' && (
            <span className="project-card-private" aria-label="private">
              <LockIcon />
            </span>
          )}
          <span className="project-card-time">{project.updatedAt}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Empty state ──────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-tracks" aria-hidden="true">
        <svg width="220" height="84" viewBox="0 0 220 84" fill="none">
          <rect x="0" y="0"  width="187" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
          <rect x="0" y="18" width="136" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
          <rect x="0" y="36" width="211" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
          <rect x="0" y="54" width="99"  height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
          <rect x="0" y="72" width="167" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <p className="empty-state-heading">nothing here yet</p>
      <p className="empty-state-body">
        start a project to begin version-controlling your music.
      </p>
      <button className="empty-state-cta" onClick={onNew}>
        + new project
      </button>
    </div>
  )
}

// ─── New project modal ────────────────────────────

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [formErr, setFormErr] = useState('')

  const nameId = useId()

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
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameErr('project needs a name')
      return
    }
    setNameErr('')
    setFormErr('')
    setLoading(true)
    try {
      await onCreate(trimmedName)
      dialogRef.current?.close()
    } catch {
      setFormErr('failed to create project — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="modal-title">
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        <h2 id="modal-title" className="modal-title">new project</h2>

        <div className="modal-fields">
          <div className="modal-field">
            <label htmlFor={nameId} className="modal-label">project name</label>
            <input
              id={nameId}
              type="text"
              className={`modal-input${nameErr ? ' has-error' : ''}`}
              placeholder="my awesome album"
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (nameErr) setNameErr('')
              }}
              autoFocus
              autoComplete="off"
              disabled={loading}
            />
            {nameErr && <span className="modal-error" role="alert">{nameErr}</span>}
          </div>
        </div>

        {formErr && <p className="modal-error" role="alert">{formErr}</p>}

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
            {loading ? 'creating…' : 'create project'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// ─── Dashboard page ───────────────────────────────

export function DashboardPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiListProjects()
      .then(data => { if (!cancelled) setProjects(data.map(toProject)) })
      .catch(() => { if (!cancelled) toast.error('failed to load projects') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [toast])

  async function handleCreate(name: string) {
    const created = await apiCreateProject(name)
    setProjects(prev => [toProject(created), ...prev])
    toast.success(`"${created.name}" created`)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-heading">your projects</h1>
          <button className="btn-new-project" onClick={() => setModalOpen(true)}>
            <PlusIcon />
            new project
          </button>
        </header>

        {loading ? (
          <div className="dashboard-loading" aria-label="loading projects" />
        ) : projects.length === 0 ? (
          <EmptyState onNew={() => setModalOpen(true)} />
        ) : (
          <div className="project-grid">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
