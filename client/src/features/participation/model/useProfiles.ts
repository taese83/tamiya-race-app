import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

export interface Profile {
  id: number
  user_id: string
  name: string
  is_default: boolean
}

export const PROFILES_QUERY_KEY = ['profiles'] as const
export const PARTICIPATIONS_QUERY_KEY = ['participations'] as const
export const SCORES_QUERY_KEY = ['scores'] as const

async function fetchProfiles(): Promise<Profile[]> {
  const res = await fetch('/api/profiles', {credentials: 'include'})
  if (res.status === 401) return []
  if (!res.ok) throw new Error(`profiles fetch 실패: ${res.status}`)
  const body = await res.json() as {profiles: Profile[]}
  return body.profiles
}

export function useProfiles(enabled: boolean) {
  const q = useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: fetchProfiles,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
  return {
    profiles: q.data ?? [],
    isLoading: q.isLoading,
  }
}

export function useCreateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name}),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(b.error ?? '프로필 생성 실패')
      }
      return res.json() as Promise<{profile: Profile}>
    },
    onSuccess: () => { void qc.invalidateQueries({queryKey: PROFILES_QUERY_KEY}) },
  })
}

interface UpdateProfilePayload {
  id: number
  name?: string
  isDefault?: boolean
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({id, name, isDefault}: UpdateProfilePayload) => {
      const body: Record<string, unknown> = {}
      if (name !== undefined) body['name'] = name
      if (isDefault !== undefined) body['isDefault'] = isDefault
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(b.error ?? '프로필 수정 실패')
      }
      return res.json() as Promise<{profile: Profile}>
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: PROFILES_QUERY_KEY})
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(b.error ?? '프로필 삭제 실패')
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: PROFILES_QUERY_KEY})
      void qc.invalidateQueries({queryKey: PARTICIPATIONS_QUERY_KEY})
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}
