import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {SCORES_QUERY_KEY} from './useParticipations'

export const CLASS_LIST = ['M.SPEED', 'M1', 'M2B', 'M2', 'M3', 'OPEN'] as const
export type ClassKey = typeof CLASS_LIST[number]

/** 누적 점수에 포함되는 클래스. 나머지는 표시만. */
export const SCORE_CLASSES: readonly ClassKey[] = ['M1', 'M2', 'M3']
export function isScoreClass(cls: ClassKey): boolean {
  return SCORE_CLASSES.includes(cls)
}

export interface ClassStat {
  station: number
  manual: number
  total: number
  participate: number
  rank1: number
  rank2: number
  rank3: number
  manualParticipate: number
  manualRank1: number
  manualRank2: number
  manualRank3: number
}

export interface ChallengeEntry {
  race_id: string
  wr_id: string
  type: 'world' | 'asia'
  class: ClassKey | null
  rank: number | null
}

export interface ChallengeSummary {
  participate: number
  rank1: number
  rank2: number
  rank3: number
}

export interface ProfileScore {
  profile_id: number
  name: string
  is_default: boolean
  byClass: Record<ClassKey, ClassStat>
  profileTotal: number
  challenges: {
    world: ChallengeSummary
    asia: ChallengeSummary
    entries: ChallengeEntry[]
  }
}

export interface AggregateScore {
  profiles: ProfileScore[]
  grandTotal: number
  entries: Array<{
    profile_id: number
    race_id: string
    class: ClassKey | null
    is_station: boolean
    rank: number | null
    points: number
  }>
}

async function fetchScores(): Promise<AggregateScore> {
  const res = await fetch('/api/scores', {credentials: 'include'})
  if (res.status === 401) {
    return {profiles: [], grandTotal: 0, entries: []}
  }
  if (!res.ok) throw new Error(`scores fetch 실패: ${res.status}`)
  return res.json() as Promise<AggregateScore>
}

export function useScores(enabled: boolean) {
  return useQuery({
    queryKey: SCORES_QUERY_KEY,
    queryFn: fetchScores,
    enabled,
    staleTime: 60 * 1000,
  })
}

export interface ManualCounts {
  participate: number
  rank1: number
  rank2: number
  rank3: number
}

interface ManualPayload extends ManualCounts {
  profileId: number
  class: ClassKey
}

export function useSetManualScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({profileId, class: cls, participate, rank1, rank2, rank3}: ManualPayload) => {
      const res = await fetch('/api/scores/manual', {
        method: 'PUT',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({profileId, class: cls, participate, rank1, rank2, rank3}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({error: `HTTP ${res.status}`}))
        throw new Error(body.error ?? `manual score 저장 실패: ${res.status}`)
      }
      return res.json() as Promise<{
        ok: boolean; profile_id: number; class: ClassKey;
        participate: number; rank1: number; rank2: number; rank3: number;
      }>
    },
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: SCORES_QUERY_KEY})
    },
  })
}
