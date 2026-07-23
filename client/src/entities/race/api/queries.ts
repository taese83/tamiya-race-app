import type {RacesResponse, RaceDetail} from '../model/types'
import {parseRegistrationStartDate} from '@/shared/lib/raceMeta'

/**
 * 두 개의 스냅샷을 분리 fetch
 *  - RACES_ACTIVE_QUERY_KEY: /races-active.json (현재 살아있는 게시글) — 리스트 뷰 기본
 *  - RACES_ALL_QUERY_KEY:    /races.json        (병합 아카이브) — 캘린더 뷰, 즐겨찾기 히스토리, 상세 lookup
 */
export const RACES_QUERY_KEY = ['races'] as const
export const RACES_ACTIVE_QUERY_KEY = ['races', 'active'] as const
export const RACES_ALL_QUERY_KEY = ['races', 'all'] as const
export const raceDetailQueryKey = (wrId: string) => ['race-detail', wrId] as const

let activeCached: RacesResponse | null = null
let allCached: RacesResponse | null = null

async function loadFromUrl(url: string): Promise<RacesResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} 로드 실패: ${res.status}`)

  // legacy 스키마의 RaceEntry에는 wrId 필드가 없을 수 있으므로 optional로 받는다
  const raw = await res.json() as {
    data?: Array<Omit<RacesResponse['data'][number], 'wrId'> & {wrId?: string}>
    details?: Record<string, RaceDetail>
    count?: number
    cachedAt?: string
  }

  const details = raw.details ?? {}
  return {
    ok: true,
    data: (raw.data ?? []).map(r => {
      // legacy 스키마 호환: wrId 필드가 없으면 id에서 파생
      const wrId = r.wrId ?? (r.id ?? '').split('-')[0] ?? ''
      const detail = details[wrId]
      const raceYear = parseInt(r.date.split('.')[0] ?? '', 10) || undefined
      const registrationStartDate = detail?.registrationDeadline
        ? parseRegistrationStartDate(detail.registrationDeadline, raceYear) ?? undefined
        : undefined
      return {
        ...r,
        wrId,
        note: r.note ?? '',
        registrationStartDate,
        registrationDeadlineRaw: detail?.registrationDeadline,
      }
    }),
    details,
    count: raw.count ?? 0,
    cachedAt: raw.cachedAt ?? new Date().toISOString(),
  }
}

/** 현재 사이트에 살아있는 게시글 — 리스트 뷰 소스 */
export async function fetchActiveRaces(_signal?: AbortSignal): Promise<RacesResponse> {
  if (activeCached) return activeCached
  activeCached = await loadFromUrl('/races-active.json')
  return activeCached
}

/** 전체 아카이브 — 캘린더 뷰, 즐겨찾기 히스토리, 상세 lookup */
export async function fetchAllRaces(_signal?: AbortSignal): Promise<RacesResponse> {
  if (allCached) return allCached
  allCached = await loadFromUrl('/races.json')
  return allCached
}

/** @deprecated fetchActiveRaces 또는 fetchAllRaces 사용. 기존 호출자 하위 호환. */
export async function fetchRaces(signal?: AbortSignal): Promise<RacesResponse> {
  return fetchAllRaces(signal)
}

export async function fetchRaceDetail(wrId: string, _signal?: AbortSignal): Promise<{ok: boolean; data: RaceDetail}> {
  // 상세는 항상 aggregated details에서 조회한다 (과거 즐겨찾기 대응)
  const data = await fetchAllRaces()
  const detail = data.details[wrId]

  if (detail) {
    return {ok: true, data: detail}
  }

  // 상세가 없는 경우 (크롤링 실패했던 항목) — 빈 상태 반환
  return {
    ok: false,
    data: {
      wrId,
      entranceFee: '',
      registrationDeadline: '',
      registrationMethod: '',
      inquiry: '',
      applyUrl: null,
      applyButtonText: null,
    },
  }
}

export async function refreshRaces(): Promise<RacesResponse> {
  activeCached = null
  allCached = null
  return fetchAllRaces()
}
