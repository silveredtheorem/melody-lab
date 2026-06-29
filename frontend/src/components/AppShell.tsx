import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { type AppShellContext } from './AppShellContext'
import { type ApiProject, apiListProjects, apiLogout } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import './AppShell.css'

// ─── Icons ────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="0"     y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
      <rect x="4.25"  y="4" width="3" height="16" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="8.5"   y="0" width="3" height="20" rx="1.5" fill="currentColor" />
      <rect x="12.75" y="3" width="3" height="17" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="17"    y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

function ProjectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ─── Search result types ─────────────────────────

interface SearchResult {
  id: string
  type: 'project' | 'branch'
  label: string
  sublabel: string
  path: string
}

function buildResults(projects: ApiProject[], query: string): SearchResult[] {
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const p of projects) {
    if (p.name.toLowerCase().includes(q)) {
      results.push({
        id: `p-${p.id}`,
        type: 'project',
        label: p.name,
        sublabel: `${p.branches.length} branch${p.branches.length !== 1 ? 'es' : ''}`,
        path: `/projects/${p.id}`,
      })
    }
    for (const b of p.branches) {
      if (b.name.toLowerCase().includes(q)) {
        results.push({
          id: `b-${b.id}`,
          type: 'branch',
          label: b.name,
          sublabel: p.name,
          path: `/projects/${p.id}/branches/${b.id}`,
        })
      }
    }
  }

  return results.slice(0, 8)
}

// ─── Notification panel ──────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  return (
    <div className="notif-panel" ref={panelRef} role="dialog" aria-label="notifications">
      <div className="notif-panel-header">
        <span className="notif-panel-title">notifications</span>
      </div>
      <div className="notif-panel-empty">
        <BellIcon />
        <p>you're all caught up</p>
      </div>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────

export function AppShell() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [breadcrumb, setBreadcrumb] = useState<React.ReactNode>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchIndex, setSearchIndex] = useState(-1)
  const [projectsCache, setProjectsCache] = useState<ApiProject[]>([])

  const accountWrapRef = useRef<HTMLDivElement>(null)
  const notifWrapRef = useRef<HTMLDivElement>(null)
  const searchDialogRef = useRef<HTMLDialogElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Prefetch projects for search
  const loadProjects = useCallback(async () => {
    try {
      const data = await apiListProjects()
      setProjectsCache(data)
    } catch (e) {
      console.warn('failed to load projects for search', e)
    }
  }, [])

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        loadProjects()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [loadProjects])

  // Drive the search <dialog> from state
  useEffect(() => {
    const dialog = searchDialogRef.current
    if (!dialog) return
    if (searchOpen) {
      dialog.showModal()
      requestAnimationFrame(() => searchInputRef.current?.focus())
    } else if (dialog.open) {
      dialog.close()
    }
  }, [searchOpen])

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchIndex(-1)
    searchDialogRef.current?.close()
  }

  // Close account menu on outside click
  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!accountWrapRef.current?.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [accountOpen])

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSearchIndex(-1)
    if (value.trim()) {
      setSearchResults(buildResults(projectsCache, value.trim()))
    } else {
      setSearchResults([])
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSearchIndex(i => Math.min(i + 1, searchResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSearchIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && searchIndex >= 0 && searchResults[searchIndex]) {
      e.preventDefault()
      navigate(searchResults[searchIndex].path)
      closeSearch()
    }
  }

  function handleResultClick(result: SearchResult) {
    navigate(result.path)
    closeSearch()
  }

  const displayName = user?.name ?? ''
  const displayEmail = user?.email ?? ''
  const userInitials = displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?'

  async function handleSignOut() {
    setAccountOpen(false)
    await apiLogout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        {/* Left: logo + breadcrumb */}
        <div className="topbar-left">
          <Link to="/dashboard" className="topbar-logo" aria-label="melody lab — dashboard">
            <span className="topbar-logo-mark">
              <LogoMark />
            </span>
            <span className="topbar-wordmark">melody lab</span>
          </Link>

          {breadcrumb && (
            <div className="topbar-breadcrumb">
              <span className="topbar-breadcrumb-sep" aria-hidden="true">/</span>
              <div className="topbar-breadcrumb-label">{breadcrumb}</div>
            </div>
          )}
        </div>

        {/* Right: search, notifications, account */}
        <div className="topbar-right">
          <button
            className="topbar-search-btn"
            onClick={() => { setSearchOpen(true); loadProjects() }}
            aria-label="search (⌘K)"
          >
            <SearchIcon />
            <span className="topbar-search-label">search</span>
            <kbd className="topbar-search-kbd">⌘K</kbd>
          </button>

          <div className="topbar-notif-wrap" ref={notifWrapRef}>
            <button
              className="topbar-icon-btn"
              aria-label="notifications"
              aria-expanded={notifOpen}
              onClick={() => setNotifOpen(o => !o)}
            >
              <BellIcon />
            </button>
            {notifOpen && (
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            )}
          </div>

          <div className="topbar-account-wrap" ref={accountWrapRef}>
            <button
              className="topbar-avatar-btn"
              aria-label="account menu"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen(o => !o)}
            >
              <span className="topbar-avatar" aria-hidden="true">
                {userInitials}
              </span>
            </button>

            {accountOpen && (
              <div className="topbar-account-menu" role="menu">
                <div className="account-menu-user">
                  <span className="account-menu-name">{displayName}</span>
                  <span className="account-menu-email">{displayEmail}</span>
                </div>
                <div className="account-menu-divider" role="separator" />
                <Link
                  to="/dashboard"
                  className="account-menu-item"
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                >
                  your projects
                </Link>
                <Link
                  to="/settings"
                  className="account-menu-item"
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                >
                  settings
                </Link>
                <div className="account-menu-divider" role="separator" />
                <button
                  className="account-menu-item account-menu-signout"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet context={{ setBreadcrumb } satisfies AppShellContext} />
      </main>

      {/* Search dialog */}
      <dialog
        ref={searchDialogRef}
        className="search-dialog"
        onClose={() => closeSearch()}
      >
        <div className="search-inner">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="search"
              className="search-input"
              placeholder="search projects, branches…"
              autoComplete="off"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <kbd className="search-esc-hint">esc</kbd>
          </div>

          {searchResults.length > 0 ? (
            <ul className="search-results" role="listbox">
              {searchResults.map((r, i) => (
                <li
                  key={r.id}
                  role="option"
                  aria-selected={i === searchIndex}
                  className={`search-result${i === searchIndex ? ' is-active' : ''}`}
                  onClick={() => handleResultClick(r)}
                  onMouseEnter={() => setSearchIndex(i)}
                >
                  <span className="search-result-icon">
                    {r.type === 'project' ? <ProjectIcon /> : <BranchIcon />}
                  </span>
                  <div className="search-result-text">
                    <span className="search-result-label">{r.label}</span>
                    <span className="search-result-sublabel">{r.sublabel}</span>
                  </div>
                  <span className="search-result-type">{r.type}</span>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim() ? (
            <p className="search-empty-hint">no results for "{searchQuery}"</p>
          ) : (
            <p className="search-empty-hint">search across all your projects and branches</p>
          )}

          <div className="search-footer">
            <span className="search-footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> navigate
            </span>
            <span className="search-footer-hint">
              <kbd>↵</kbd> open
            </span>
            <span className="search-footer-hint">
              <kbd>esc</kbd> close
            </span>
          </div>
        </div>
      </dialog>
    </div>
  )
}
