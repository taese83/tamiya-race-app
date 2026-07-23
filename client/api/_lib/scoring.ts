import type {ParticipationRow, ManualScoreRow, ProfileRow} from './db.js'

/**
 * 서버 측 클래스별 점수 계산 + 프로필별 breakdown.
 * client/src/entities/race/model/categoryColors.ts의 CLASS_LIST와 동기 유지.
 */
export const CLASS_LIST = ['M.SPEED', 'M1', 'M2B', 'M2', 'M3', 'OPEN'] as const
export type ClassKey = typeof CLASS_LIST[number]

export type RaceType = 'world' | 'asia' | 'station'

export function getRaceType(title: string): RaceType {
  if (title.includes('TMWC')) return 'world'
  if (title.includes('TMAC')) return 'asia'
  return 'station'
}

/** race.category (예: "M.SPEED 클래스") → CLASS_LIST key */
export function normalizeClass(category: string | null | undefined): ClassKey | null {
  if (!category) return null
  const clean = category.replace(' 클래스', '').trim()
  return (CLASS_LIST as readonly string[]).includes(clean) ? clean as ClassKey : null
}

interface RaceListEntry {
  id: string
  wrId?: string
  title: string
  category?: string
}

interface RacesPayload {
  data?: RaceListEntry[]
}

interface RaceMeta {
  type: RaceType
  class: ClassKey | null
}

let cachedMetaById: Map<string, RaceMeta> | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

async function loadMetaMap(host: string): Promise<Map<string, RaceMeta>> {
  const now = Date.now()
  if (cachedMetaById && now - cachedAt < CACHE_TTL_MS) return cachedMetaById

  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const url = `${proto}://${host}/races.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`races.json 로드 실패: ${res.status}`)
  const payload = await res.json() as RacesPayload
  const map = new Map<string, RaceMeta>()
  for (const r of payload.data ?? []) {
    if (!r.id || !r.title) continue
    map.set(r.id, {type: getRaceType(r.title), class: normalizeClass(r.category)})
  }
  cachedMetaById = map
  cachedAt = now
  return map
}

/** 클래스별 세부 점수와 카운트 */
export interface ClassStat {
  station: number    // 자동 계산 (참여+순위)
  manual: number     // 수동 입력
  total: number      // station + manual
  participate: number
  rank1: number
  rank2: number
  rank3: number
}

/** TMWC/TMAC 개별 참여 항목 (점수 계산 대상 아님, 히스토리 표시용) */
export interface ChallengeEntry {
  race_id: string
  wr_id: string
  type: 'world' | 'asia'
  class: ClassKey | null
  rank: number | null
}

/** 챌린지 유형별 통계 요약 */
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
    entries: ChallengeEntry[]  // 세부 목록 (최신순)
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

function makeEmptyClassStat(): ClassStat {
  return {station: 0, manual: 0, total: 0, participate: 0, rank1: 0, rank2: 0, rank3: 0}
}

function makeEmptyByClass(): Record<ClassKey, ClassStat> {
  const rec = {} as Record<ClassKey, ClassStat>
  for (const c of CLASS_LIST) rec[c] = makeEmptyClassStat()
  return rec
}

export function scoreForRank(rank: number | null): number {
  const participation = 1
  const bonus = rank === 1 ? 5 : rank === 2 ? 3 : rank === 3 ? 1 : 0
  return participation + bonus
}

/** 참여 목록 + 프로필 목록 + 수동 점수를 aggregate. 스테이션 경기만 카운트. */
export async function computeAggregate(
  profiles: ProfileRow[],
  participations: ParticipationRow[],
  manuals: ManualScoreRow[],
  host: string,
): Promise<AggregateScore> {
  const metaMap = await loadMetaMap(host)

  // 프로필별 초기 통계 컨테이너
  const emptyChallenge = (): ChallengeSummary => ({participate: 0, rank1: 0, rank2: 0, rank3: 0})
  const byProfile: Map<number, ProfileScore> = new Map(
    profiles.map(p => [p.id, {
      profile_id: p.id,
      name: p.name,
      is_default: p.is_default,
      byClass: makeEmptyByClass(),
      profileTotal: 0,
      challenges: {world: emptyChallenge(), asia: emptyChallenge(), entries: []},
    }]),
  )

  const entries: AggregateScore['entries'] = []

  for (const part of participations) {
    const ps = byProfile.get(part.profile_id)
    if (!ps) continue
    const meta = metaMap.get(part.race_id)
    const cls: ClassKey | null = normalizeClass(part.category) ?? meta?.class ?? null
    const raceType: RaceType = meta?.type ?? 'station'
    const isStation = raceType === 'station'

    // attended=false는 '선정만' 상태 → 점수/카운트 반영 안 함
    if (!part.attended) {
      entries.push({
        profile_id: part.profile_id,
        race_id: part.race_id,
        class: cls,
        is_station: isStation,
        rank: part.rank,
        points: 0,
      })
      continue
    }

    if (isStation && cls) {
      const stat = ps.byClass[cls]
      const pts = scoreForRank(part.rank)
      stat.station += pts
      stat.participate += 1
      if (part.rank === 1) stat.rank1 += 1
      else if (part.rank === 2) stat.rank2 += 1
      else if (part.rank === 3) stat.rank3 += 1
    } else if (raceType === 'world' || raceType === 'asia') {
      const summary = ps.challenges[raceType]
      summary.participate += 1
      if (part.rank === 1) summary.rank1 += 1
      else if (part.rank === 2) summary.rank2 += 1
      else if (part.rank === 3) summary.rank3 += 1
      ps.challenges.entries.push({
        race_id: part.race_id,
        wr_id: part.wr_id,
        type: raceType,
        class: cls,
        rank: part.rank,
      })
    }

    entries.push({
      profile_id: part.profile_id,
      race_id: part.race_id,
      class: cls,
      is_station: isStation,
      rank: part.rank,
      points: isStation && cls ? scoreForRank(part.rank) : 0,
    })
  }

  // challenge entries 최신 race_id (사전 정렬 없으므로 wr_id 내림차순) 순
  for (const ps of byProfile.values()) {
    ps.challenges.entries.sort((a, b) => b.wr_id.localeCompare(a.wr_id))
  }

  // 수동 점수 반영
  for (const m of manuals) {
    const ps = byProfile.get(m.profile_id)
    if (!ps) continue
    const cls = m.class as ClassKey
    if (ps.byClass[cls]) ps.byClass[cls].manual = m.points
  }

  // total, profileTotal, grandTotal 계산
  let grandTotal = 0
  for (const ps of byProfile.values()) {
    let profileTotal = 0
    for (const cls of CLASS_LIST) {
      const stat = ps.byClass[cls]
      stat.total = stat.station + stat.manual
      profileTotal += stat.total
    }
    ps.profileTotal = profileTotal
    grandTotal += profileTotal
  }

  return {
    profiles: Array.from(byProfile.values()).sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      return a.profile_id - b.profile_id
    }),
    grandTotal,
    entries,
  }
}

/** race_id의 category만 필요할 때 (participation 저장 시 사용) */
export async function getCategoryForRace(raceId: string, host: string): Promise<ClassKey | null> {
  const metaMap = await loadMetaMap(host)
  return metaMap.get(raceId)?.class ?? null
}
