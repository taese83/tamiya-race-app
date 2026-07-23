import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {PROFILES_QUERY_KEY} from './useProfiles'

export interface Participation {
  profile_id: number
  race_id: string
  wr_id: string
  rank: number | null  // 1|2|3|null
  category: string | null
}

export const PARTICIPATIONS_QUERY_KEY = ['participations'] as const
export const SCORES_QUERY_KEY = ['scores'] as const
export {PROFILES_QUERY_KEY}

async function fetchParticipations(): Promise<Participation[]> {
  const res = await fetch('/api/participations', {credentials: 'include'})
  if (res.status === 401) return []
  if (!res.ok) throw new Error(`participations fetch 실패: ${res.status}`)
  const body = await res.json() as {participations: Participation[]}
  return body.participations
}

/** 로그인 사용자의 모든 프로필의 참여 목록 (join). 미로그인 시 빈 배열. */
export function useParticipations(enabled: boolean) {
  const q = useQuery({
    queryKey: PARTICIPATIONS_QUERY_KEY,
    queryFn: fetchParticipations,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
  }
}

/** race_id → 이 race에 참여한 프로필들 (profile_id → Participation) */
export function makeParticipationByRace(list: Participation[]): Map<string, Map<number, Participation>> {
  const map = new Map<string, Map<number, Participation>>()
  for (const p of list) {
    const inner = map.get(p.race_id) ?? new Map<number, Participation>()
    inner.set(p.profile_id, p)
    map.set(p.race_id, inner)
  }
  return map
}

interface UpsertPayload {
  profileId: number
  raceId: string
  wrId: string
  rank: number | null
  category?: string | null
}

export function useUpsertParticipation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({profileId, raceId, wrId, rank, category}: UpsertPayload) => {
      const res = await fetch('/api/participations', {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({profileId, raceId, wrId, rank, category}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(body.error ?? `PUT 실패: ${res.status}`)
      }
      return res.json() as Promise<Participation>
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: PARTICIPATIONS_QUERY_KEY})
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}

interface DeletePayload {
  profileId: number
  raceId: string
}

export function useDeleteParticipation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({profileId, raceId}: DeletePayload) => {
      const params = new URLSearchParams({profileId: String(profileId), raceId})
      const res = await fetch(`/api/participations?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`DELETE 실패: ${res.status}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: PARTICIPATIONS_QUERY_KEY})
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}
