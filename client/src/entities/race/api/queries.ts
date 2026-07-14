import type {RacesResponse, RaceDetail} from '../model/types'

export const RACES_QUERY_KEY = ['races'] as const
export const raceDetailQueryKey = (wrId: string) => ['race-detail', wrId] as const

let cached: RacesResponse | null = null

/**
 * /races.json (public/) 에서 데이터 로드
 * Vercel: GitHub Actions가 매일 생성한 파일이 빌드 시 public/에 복사됨
 * 로컬 개발: pnpm crawl 후 node scripts/prepare-build.cjs 실행 필요
 */
async function loadData(): Promise<RacesResponse> {
  if (cached) return cached

  const res = await fetch('/races.json')
  if (!res.ok) throw new Error(`races.json 로드 실패: ${res.status}`)

  const raw = await res.json() as {
    data: RacesResponse['data']
    details?: Record<string, RaceDetail>
    count: number
    cachedAt: string
  }

  cached = {
    ok: true,
    data: raw.data ?? [],
    details: raw.details ?? {},
    count: raw.count ?? 0,
    cachedAt: raw.cachedAt ?? new Date().toISOString(),
  }
  return cached
}

export async function fetchRaces(signal?: AbortSignal): Promise<RacesResponse> {
  // signal이 있어도 fetch로 처리 (abort 지원)
  const controller = signal ? undefined : undefined
  void controller
  return loadData()
}

export async function fetchRaceDetail(wrId: string, _signal?: AbortSignal): Promise<{ok: boolean; data: RaceDetail}> {
  const data = await loadData()
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
  // 파일 기반 방식에서 새로고침 = 캐시 초기화 후 재로드
  cached = null
  return loadData()
}
