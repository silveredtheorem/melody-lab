import { useAuthStore } from '../stores/auth.store'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  status: number
  body: { error: string }
  constructor(status: number, body: { error: string }) {
    super(body.error)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// ─── Token refresh (deduplicated + short-lived cache) ─

let refreshInFlight: Promise<string | null> | null = null
let refreshCache: { token: string; at: number } | null = null
const REFRESH_CACHE_MS = 10_000 // 10 s covers React Strict Mode double-invoke

async function refreshTokens(): Promise<string | null> {
  if (refreshCache && Date.now() - refreshCache.at < REFRESH_CACHE_MS) {
    return refreshCache.token
  }
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    let res: Response
    try {
      res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    } catch {
      // Network error or aborted fetch (e.g. page refresh) — don't clear auth,
      // the next page load will retry with the same cookie.
      return null
    }
    if (!res.ok) {
      refreshCache = null
      useAuthStore.getState().clearAuth()
      return null
    }
    const data = await res.json()
    const newToken = data.accessToken as string
    refreshCache = { token: newToken, at: Date.now() }
    const { user } = useAuthStore.getState()
    if (user) useAuthStore.getState().setAuth(newToken, user)
    return newToken
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

// ─── Core fetch wrapper ───────────────────────────────

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = () => useAuthStore.getState().accessToken

  const doFetch = (t: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers as Record<string, string> ?? {}),
      },
    })

  let res = await doFetch(token())

  if (res.status === 401 && token()) {
    const newToken = await refreshTokens()
    if (!newToken) {
      window.location.replace('/auth')
      throw new ApiError(401, { error: 'Session expired' })
    }
    res = await doFetch(newToken)
  }

  if (!res.ok) {
    let body = { error: 'Request failed' }
    try { body = await res.json() } catch { /* ignore parse error */ }
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiRegister(email: string, password: string, name: string) {
  return apiFetch<{ accessToken: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function apiRefresh(): Promise<string | null> {
  return refreshTokens()
}

export async function apiLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch { /* ignore logout errors */ }
  useAuthStore.getState().clearAuth()
}

export async function apiGetMe() {
  return apiFetch<AuthUser>('/auth/me')
}

export async function apiUpdateProfile(name: string) {
  return apiFetch<AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// ─── Projects ─────────────────────────────────────────

export interface ApiMember {
  id: string
  projectId: string
  userId: string
  role: 'OWNER' | 'COLLABORATOR'
  joinedAt: string
  user: { id: string; name: string }
}

export interface ApiCommitSummary {
  id: string
  projectId: string
  parentId: string | null
  authorId: string
  message: string
  createdAt: string
}

export interface ApiBranch {
  id: string
  projectId: string
  name: string
  headCommitId: string | null
  createdAt: string
  headCommit?: ApiCommitSummary | null
}

export interface ApiProject {
  id: string
  name: string
  ownerId: string
  createdAt: string
  branches: ApiBranch[]
  members: ApiMember[]
}

export async function apiListProjects() {
  return apiFetch<ApiProject[]>('/projects')
}

export async function apiCreateProject(name: string) {
  return apiFetch<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function apiGetProject(projectId: string) {
  return apiFetch<ApiProject>(`/projects/${projectId}`)
}

// ─── Branches ─────────────────────────────────────────

export async function apiListBranches(projectId: string) {
  return apiFetch<ApiBranch[]>(`/projects/${projectId}/branches`)
}

export async function apiDeleteBranch(projectId: string, branchId: string) {
  return apiFetch<void>(`/projects/${projectId}/branches/${branchId}`, { method: 'DELETE' })
}

export async function apiCreateBranch(projectId: string, name: string, fromBranch?: string) {
  return apiFetch<ApiBranch>(`/projects/${projectId}/branches`, {
    method: 'POST',
    body: JSON.stringify({ name, fromBranch }),
  })
}

// ─── Commits ──────────────────────────────────────────

export interface ApiCommitAuthor {
  id: string
  name: string
}

export interface ApiCommit {
  id: string
  projectId: string
  parentId: string | null
  mergeParentId: string | null
  authorId: string
  author?: ApiCommitAuthor | null
  message: string
  createdAt: string
}

export interface ApiLayer {
  id: string
  commitId: string
  s3Key: string
  instrument: string
  durationMs: number
  startMs: number
  bpm: number | null
  keySignature: string | null
  sourceType: 'HUMAN' | 'AI_GENERATED'
  createdBy: string | null
  createdAt: string
}

export interface ApiCommitWithLayers extends ApiCommit {
  layers: ApiLayer[]
}

export async function apiGetCommitHistory(projectId: string, branchId: string) {
  return apiFetch<ApiCommit[]>(`/projects/${projectId}/commits/history/${branchId}`)
}

export async function apiGetCommit(projectId: string, commitId: string) {
  return apiFetch<ApiCommitWithLayers>(`/projects/${projectId}/commits/${commitId}`)
}

// ─── Storage ──────────────────────────────────────────

export async function apiGetPlaybackUrl(s3Key: string): Promise<{ url: string }> {
  const data = await apiFetch<{ signedUrl: string }>(`/storage/playback-url?key=${encodeURIComponent(s3Key)}`)
  return { url: data.signedUrl }
}

export async function apiGetUploadUrl(s3Key: string): Promise<{ signedUrl: string; s3Key: string }> {
  return apiFetch<{ signedUrl: string; s3Key: string }>('/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify({ s3Key }),
  })
}

export async function apiCreateCommit(
  projectId: string,
  branchId: string,
  message: string,
  layers: Array<{
    s3Key: string
    instrument: string
    durationMs: number
    startMs: number
    bpm?: number
    keySignature?: string
    sourceType: 'HUMAN' | 'AI_GENERATED'
  }>,
) {
  return apiFetch<ApiCommitWithLayers>(`/projects/${projectId}/commits`, {
    method: 'POST',
    body: JSON.stringify({ branchId, message, layers }),
  })
}

export async function apiRequestAIGeneration(
  projectId: string,
  branchId: string,
  instrument: string,
  prompt: string,
) {
  return apiFetch<ApiLayer>(`/projects/${projectId}/ai/generate`, {
    method: 'POST',
    body: JSON.stringify({ branchId, instrument, prompt, sourceType: 'MUBERT' }),
  })
}

// ─── Merge requests ───────────────────────────────────

export interface ApiConflict {
  id: string
  mergeRequestId: string
  instrument: string
  ourLayerId: string
  theirLayerId: string
  resolution: 'OURS' | 'THEIRS' | 'BOTH' | null
  resolvedAt: string | null
  ourLayer: ApiLayer
  theirLayer: ApiLayer
}

export interface ApiMergeRequest {
  id: string
  projectId: string
  sourceBranchId: string
  targetBranchId: string
  commonAncestorId: string | null
  status: 'OPEN' | 'RESOLVED' | 'CANCELLED'
  createdBy: string
  createdAt: string
  sourceBranch: ApiBranch
  targetBranch: ApiBranch
  conflicts: ApiConflict[]
}

export async function apiGetMergeRequest(projectId: string, mrId: string) {
  return apiFetch<ApiMergeRequest>(`/projects/${projectId}/merge-requests/${mrId}`)
}

export async function apiCreateMergeRequest(
  projectId: string,
  sourceBranchId: string,
  targetBranchId: string,
) {
  return apiFetch<ApiMergeRequest>(`/projects/${projectId}/merge-requests`, {
    method: 'POST',
    body: JSON.stringify({ sourceBranchId, targetBranchId }),
  })
}

export async function apiResolveConflict(
  projectId: string,
  mrId: string,
  conflictId: string,
  resolution: 'OURS' | 'THEIRS' | 'BOTH',
) {
  return apiFetch<ApiConflict>(
    `/projects/${projectId}/merge-requests/${mrId}/conflicts/${conflictId}`,
    { method: 'PATCH', body: JSON.stringify({ resolution }) },
  )
}

export async function apiCompleteMerge(projectId: string, mrId: string) {
  return apiFetch<ApiCommitWithLayers>(
    `/projects/${projectId}/merge-requests/${mrId}/complete`,
    { method: 'POST' },
  )
}
