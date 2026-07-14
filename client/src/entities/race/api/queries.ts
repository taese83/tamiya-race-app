import axios from 'axios'
import type {RacesResponse, RaceDetailResponse} from '../model/types'

export const RACES_QUERY_KEY = ['races'] as const
export const raceDetailQueryKey = (wrId: string) => ['race-detail', wrId] as const

let staticRaces: RacesResponse | null = null
let staticLoaded = false

/**
 * /races.json (public 폴더) 에서 빌드 시 생성된 정적 데이터를 fetch
 * Vercel: 빌드 스크립트가 data/races.json → client/public/races.json 복사
 * 로컬 개발: 파일 없으면 null 반환 → API fallback
 */
async function loadStaticRaces(): Promise<RacesResponse | null> {
  if (staticLoaded) return staticRaces
  staticLoaded = true
  try {
    const res = await fetch('/races.json')
    if (!res.ok) return null
    const raw = await res.json() as {data: unknown; count: number; cachedAt: string}
    if (!Array.isArray(raw.data) || raw.count === 0) return null
    staticRaces = {ok: true, data: raw.data, count: raw.count, cachedAt: raw.cachedAt} as RacesResponse
    return staticRaces
  } catch {
    return null
  }
}

export async function fetchRaces(signal?: AbortSignal): Promise<RacesResponse> {
  const bundled = await loadStaticRaces()
  if (bundled) return bundled

  // fallback: 로컬 개발 또는 정적 파일 없을 때
  const res = await axios.get<RacesResponse>('/api/races', {signal})
  return res.data
}

export async function fetchRaceDetail(wrId: string, signal?: AbortSignal): Promise<RaceDetailResponse> {
  const res = await axios.get<RaceDetailResponse>(`/api/races/${wrId}/detail`, {signal})
  return res.data
}

export async function refreshRaces(): Promise<RacesResponse> {
  staticRaces = null
  staticLoaded = false
  const res = await axios.post<RacesResponse>('/api/races/refresh')
  return res.data
}
