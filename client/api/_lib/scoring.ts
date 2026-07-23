import type {ParticipationRow} from './db.js'

/**
 * 서버 측 스테이션 판정 + 점수 계산.
 * client/src/shared/lib/raceMeta.ts의 getRaceType과 동일한 규칙을 서버에도 유지.
 * races.json은 self origin fetch로 로드해 조작 불가능.
 */
export type RaceType = 'world' | 'asia' | 'station'

export function getRaceType(title: string): RaceType {
  if (title.includes('TMWC')) return 'world'
  if (title.includes('TMAC')) return 'asia'
  return 'station'
}

interface RaceListEntry {
  id: string
  wrId?: string
  title: string
}

interface RacesPayload {
  data?: RaceListEntry[]
}

let cachedRaceTypeById: Map<string, RaceType> | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

async function loadRaceTypeMap(host: string): Promise<Map<string, RaceType>> {
  const now = Date.now()
  if (cachedRaceTypeById && now - cachedAt < CACHE_TTL_MS) return cachedRaceTypeById

  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const url = `${proto}://${host}/races.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`races.json 로드 실패: ${res.status}`)
  const payload = await res.json() as RacesPayload
  const map = new Map<string, RaceType>()
  for (const r of payload.data ?? []) {
    if (r.id && r.title) map.set(r.id, getRaceType(r.title))
  }
  cachedRaceTypeById = map
  cachedAt = now
  return map
}

/** 점수 규칙 — 참가 1점 + 순위 보너스. 스테이션 경기만 카운트. */
export function scoreForRank(rank: number | null): number {
  const participation = 1
  const bonus = rank === 1 ? 5 : rank === 2 ? 3 : rank === 3 ? 1 : 0
  return participation + bonus
}

export interface ScoreBreakdown {
  manual: number
  stationTotal: number
  total: number
  entries: Array<{
    race_id: string
    is_station: boolean
    rank: number | null
    points: number  // 이 race에서 나온 점수 (station이 아니면 0)
  }>
}

export async function computeScore(
  participations: ParticipationRow[],
  manual: number,
  host: string,
): Promise<ScoreBreakdown> {
  const typeMap = await loadRaceTypeMap(host)
  let stationTotal = 0
  const entries = participations.map(p => {
    const type = typeMap.get(p.race_id)
    const isStation = type === 'station' || (type == null)  // unknown race는 station으로 가정 (구 아카이브 방어)
    const points = isStation ? scoreForRank(p.rank) : 0
    stationTotal += points
    return {race_id: p.race_id, is_station: isStation, rank: p.rank, points}
  })
  return {
    manual,
    stationTotal,
    total: manual + stationTotal,
    entries,
  }
}
