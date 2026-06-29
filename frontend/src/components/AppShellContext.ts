import { useOutletContext } from 'react-router-dom'

export type AppShellContext = {
  setBreadcrumb: (node: React.ReactNode) => void
}

export function useAppShell() {
  return useOutletContext<AppShellContext>()
}
