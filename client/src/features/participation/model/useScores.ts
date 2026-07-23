import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {SCORES_QUERY_KEY} from './useParticipations'

export interface ScoreBreakdown {
  manual: number
  stationTotal: number
  total: number
  entries: Array<{
    race_id: string
    is_station: boolean
    rank: number | null
    points: number
  }>
}

async function fetchScores(): Promise<ScoreBreakdown> {
  const res = await fetch('/api/scores', {credentials: 'include'})
  if (res.status === 401) {
    return {manual: 0, stationTotal: 0, total: 0, entries: []}
  }
  if (!res.ok) throw new Error(`scores fetch 실패: ${res.status}`)
  return res.json() as Promise<ScoreBreakdown>
}

export function useScores(enabled: boolean) {
  return useQuery({
    queryKey: SCORES_QUERY_KEY,
    queryFn: fetchScores,
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useSetManualScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (points: number) => {
      const res = await fetch('/api/scores/manual', {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({points}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(body.error ?? `manual score 저장 실패: ${res.status}`)
      }
      return res.json() as Promise<{ok: boolean; points: number}>
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}
