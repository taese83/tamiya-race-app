import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

export interface Participation {
  race_id: string
  wr_id: string
  rank: number | null  // 1|2|3|null
}

export const PARTICIPATIONS_QUERY_KEY = ['participations'] as const
export const SCORES_QUERY_KEY = ['scores'] as const

async function fetchParticipations(): Promise<Participation[]> {
  const res = await fetch('/api/participations', {credentials: 'include'})
  if (res.status === 401) return []
  if (!res.ok) throw new Error(`participations fetch 실패: ${res.status}`)
  const body = await res.json() as {participations: Participation[]}
  return body.participations
}

/** 로그인 사용자의 참여 목록. 미로그인 시 빈 배열. */
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

/** race.id → Participation 매핑 (Map보다 빠른 lookup용 Set/Map 헬퍼) */
export function makeParticipationMap(list: Participation[]): Map<string, Participation> {
  return new Map(list.map(p => [p.race_id, p]))
}

interface UpsertPayload {
  raceId: string
  wrId: string
  rank: number | null
}

export function useUpsertParticipation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({raceId, wrId, rank}: UpsertPayload) => {
      const res = await fetch(`/api/participations/${encodeURIComponent(raceId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({wrId, rank}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(body.error ?? `PUT 실패: ${res.status}`)
      }
      return res.json() as Promise<{race_id: string; wr_id: string; rank: number | null}>
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: PARTICIPATIONS_QUERY_KEY})
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}

export function useDeleteParticipation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (raceId: string) => {
      const res = await fetch(`/api/participations/${encodeURIComponent(raceId)}`, {
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
