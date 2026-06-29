import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppShell } from '../components/AppShellContext'
import { useToast } from '../components/ToastProvider'
import { type ApiBranch, type ApiProject, apiCreateBranch, apiDeleteBranch, apiGetProject } from '../lib/api'
import { relativeTime } from '../lib/utils'
import './ProjectHomePage.css'

// ─── Types ────────────────────────────────────────

interface Branch {
  id: string
  name: string
  isDefault: boolean
  updatedAt: string
}

interface ProjectMeta {
  id: string
  name: string
  memberCount: number
  defaultBranch: string
}

// ─── Data mapping ─────────────────────────────────

function toBranch(b: ApiBranch): Branch {
  const lastActivity = b.headCommit?.createdAt ?? b.createdAt
  return {
    id: b.id,
    name: b.name,
    isDefault: b.name === 'main',
    updatedAt: relativeTime(lastActivity),
  }
}

function toProjectMeta(p: ApiProject): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    memberCount: p.members.length,
    defaultBranch: p.branches.find(b => b.name === 'main')?.name ?? p.branches[0]?.name ?? 'main',
  }
}

// ─── Icons ────────────────────────────────────────

function BranchIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="5"  cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Branch row ───────────────────────────────────

function BranchRow({ branch, projectId, index, onDelete }: {
  branch: Branch; projectId: string; index: number; onDelete: (id: string) => void
}) {
  const branchPath = `/projects/${projectId}/branches/${branch.id}`
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  return (
    <li
      className="branch-row"
      style={{ '--row-index': index } as React.CSSProperties}
    >
      <div className="branch-row-left">
        <span className="branch-icon"><BranchIcon /></span>
        <Link to={branchPath} className="branch-name-link">{branch.name}</Link>
        {branch.isDefault && <span className="branch-default-pill">default</span>}
      </div>

      <div className="branch-row-center" />

      <div className="branch-row-right">
        <span className="branch-time">{branch.updatedAt}</span>
        <div className="branch-row-actions" ref={wrapRef}>
          <button
            className="branch-action-btn"
            aria-label={`more options for ${branch.name}`}
            aria-expanded={menuOpen}
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="branch-action-menu" role="menu">
              <Link
                to={branchPath}
                className="branch-action-menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                view branch
              </Link>
              {!branch.isDefault && (
                <button
                  className="branch-action-menu-item branch-action-menu-delete"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDelete(branch.id) }}
                >
                  delete branch
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

// ─── Branch name validation ───────────────────────

function validateBranchName(name: string): string | undefined {
  if (!name.trim()) return 'branch needs a name'
  if (!/^[a-z0-9][a-z0-9/\-_.]*$/.test(name.trim())) {
    return 'use lowercase letters, numbers, / and -'
  }
  return undefined
}

// ─── New branch modal ─────────────────────────────

interface NewBranchModalProps {
  branches: Branch[]
  onClose: () => void
  onCreate: (name: string, fromBranch: string) => Promise<void>
}

function NewBranchModal({ branches, onClose, onCreate }: NewBranchModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [forkFrom, setForkFrom] = useState(
    branches.find(b => b.isDefault)?.name ?? branches[0]?.name ?? 'main',
  )
  const [nameErr, setNameErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [loading, setLoading] = useState(false)

  const nameId = useId()
  const forkId = useId()

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
    const trimmed = name.trim()
    const err = validateBranchName(trimmed)
    if (err) { setNameErr(err); return }
    setNameErr('')
    setFormErr('')
    setLoading(true)
    try {
      await onCreate(trimmed, forkFrom)
      dialogRef.current?.close()
    } catch {
      setFormErr('failed to create branch — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="branch-modal" aria-labelledby="branch-modal-title">
      <form className="branch-modal-form" onSubmit={handleSubmit} noValidate>
        <h2 id="branch-modal-title" className="branch-modal-title">new branch</h2>

        <div className="branch-modal-fields">
          <div className="branch-modal-field">
            <label htmlFor={nameId} className="branch-modal-label">branch name</label>
            <input
              id={nameId}
              type="text"
              className={`branch-modal-input${nameErr ? ' has-error' : ''}`}
              placeholder="feat/my-idea"
              value={name}
              onChange={e => {
                setName(e.target.value.toLowerCase())
                if (nameErr) setNameErr('')
              }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
            {nameErr
              ? <span className="branch-modal-error" role="alert">{nameErr}</span>
              : <span className="branch-modal-hint">lowercase letters, numbers, / and - only</span>
            }
          </div>

          {branches.length > 0 && (
            <div className="branch-modal-field">
              <label htmlFor={forkId} className="branch-modal-label">fork from</label>
              <div className="branch-modal-select-wrap">
                <select
                  id={forkId}
                  className="branch-modal-select"
                  value={forkFrom}
                  onChange={e => setForkFrom(e.target.value)}
                  disabled={loading}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <span className="branch-modal-select-arrow"><ChevronDownIcon /></span>
              </div>
            </div>
          )}
        </div>

        {formErr && <p className="branch-modal-error" role="alert">{formErr}</p>}

        <div className="branch-modal-actions">
          <button
            type="button"
            className="branch-modal-cancel"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
          >
            cancel
          </button>
          <button type="submit" className="branch-modal-submit" disabled={loading}>
            {loading && <span className="branch-modal-spinner" aria-hidden="true" />}
            {loading ? 'creating…' : 'create branch'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

// ─── Project home page ────────────────────────────

export function ProjectHomePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { setBreadcrumb } = useAppShell()
  const { toast } = useToast()

  const [project, setProject] = useState<ProjectMeta | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await apiGetProject(projectId)
      setProject(toProjectMeta(data))
      setBranches(data.branches.map(toBranch))
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (project?.name) setBreadcrumb(project.name)
    return () => setBreadcrumb(null)
  }, [setBreadcrumb, project?.name])

  if (loading) {
    return (
      <div className="project-home">
        <div className="project-home-container">
          <div className="page-loading" aria-label="loading" />
        </div>
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="project-home">
        <div className="project-home-container">
          <div className="project-not-found">
            <h2>project not found</h2>
            <p>this project doesn't exist or you don't have access.</p>
            <Link to="/dashboard" style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '8px' }}>
              ← back to your projects
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const onlyMain = branches.length === 1 && branches[0].isDefault

  async function handleDelete(branchId: string) {
    try {
      await apiDeleteBranch(projectId!, branchId)
      setBranches(prev => prev.filter(b => b.id !== branchId))
      toast.success('branch deleted')
    } catch {
      toast.error('failed to delete branch')
    }
  }

  async function handleCreate(name: string, fromBranch: string) {
    const created = await apiCreateBranch(projectId!, name, fromBranch)
    const newBranch = toBranch(created)
    setBranches(prev => {
      const mainIdx = prev.findIndex(b => b.isDefault)
      const next = [...prev]
      next.splice(mainIdx + 1, 0, newBranch)
      return next
    })
    toast.success(`branch "${name}" created`)
  }

  return (
    <div className="project-home">
      <div className="project-home-container">

        <header className="project-header">
          <div className="project-header-left">
            <h1 className="project-name">{project.name}</h1>

            <div className="project-meta">
              <span className="project-meta-badge">
                {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
              </span>

              <span className="project-meta-dot" aria-hidden="true">·</span>

              <span className="project-meta-branch">
                <BranchIcon size={10} />
                {project.defaultBranch}
              </span>
            </div>
          </div>

          <button className="btn-new-branch" onClick={() => setModalOpen(true)}>
            <PlusIcon />
            new branch
          </button>
        </header>

        <ul className="branch-list" aria-label="branches">
          {branches.map((branch, i) => (
            <BranchRow
              key={branch.id}
              branch={branch}
              projectId={project.id}
              index={i}
              onDelete={handleDelete}
            />
          ))}
        </ul>

        {onlyMain && (
          <div className="branch-solo-nudge">
            <p className="branch-solo-nudge-text">create a branch to start collaborating</p>
            <p className="branch-solo-nudge-sub">branches let you experiment without touching main</p>
            <button className="branch-solo-nudge-cta" onClick={() => setModalOpen(true)}>
              + new branch
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <NewBranchModal
          branches={branches}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
