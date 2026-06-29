import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useAppShell } from '../components/AppShellContext'

function CompassIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  )
}

export function NotFoundPage() {
  const { setBreadcrumb } = useAppShell()

  useEffect(() => {
    setBreadcrumb('not found')
    return () => setBreadcrumb(null)
  }, [setBreadcrumb])

  return (
    <div className="not-found-page">
      <EmptyState
        size="page"
        icon={<CompassIcon />}
        title="page not found"
        body="the page you're looking for doesn't exist or has moved"
        action={
          <Link to="/dashboard" className="empty-state-back-link">← back to dashboard</Link>
        }
      />
    </div>
  )
}
