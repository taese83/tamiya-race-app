import {useQuery, useQueryClient} from '@tanstack/react-query'

export interface SessionUser {
  id: string
  email: string
  name: string
  picture?: string
}

export interface SessionResponse {
  authenticated: boolean
  user?: SessionUser
}

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

async function fetchSession(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', {credentials: 'include'})
  if (!res.ok) throw new Error(`session fetch 실패: ${res.status}`)
  return res.json() as Promise<SessionResponse>
}

export function useSession() {
  const q = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    // 30분마다 백그라운드 revalidate
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })
  return {
    user: q.data?.authenticated ? q.data.user ?? null : null,
    isReady: q.isSuccess,
    isLoading: q.isLoading,
  }
}

export function loginWithGoogle() {
  // full-page redirect. Google이 콜백으로 다시 리다이렉트.
  window.location.href = '/api/auth/google/start'
}

export function useLogout() {
  const qc = useQueryClient()
  return async () => {
    await fetch('/api/auth/logout', {method: 'POST', credentials: 'include'})
    qc.setQueryData(SESSION_QUERY_KEY, {authenticated: false})
  }
}
