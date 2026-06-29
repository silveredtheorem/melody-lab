import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { useAuthStore } from './stores/auth.store'
import { ToastProvider } from './components/ToastProvider'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectHomePage } from './pages/ProjectHomePage'
import { BranchViewPage } from './pages/BranchViewPage'
import { MergeRequestPage } from './pages/MergeRequestPage'
import { CommitDetailPage } from './pages/CommitDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/auth', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', color: 'var(--ink-subtle)', fontSize: '13px',
      }}>
        loading…
      </div>
    )
  }

  if (!isAuthenticated) return null
  return <>{children}</>
}

const router = createBrowserRouter([
  { path: '/',     element: <LandingPage /> },
  { path: '/auth', element: <AuthPage /> },
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/projects/:projectId', element: <ProjectHomePage /> },
      { path: '/projects/:projectId/branches/:branchId', element: <BranchViewPage /> },
      { path: '/projects/:projectId/branches/:branchId/commits/:commitId', element: <CommitDetailPage /> },
      { path: '/projects/:projectId/merge-requests/:mrId', element: <MergeRequestPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
