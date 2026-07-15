import type {RaceEntry} from '@/entities/race'

export interface ItineraryEntry {
  race: RaceEntry
  isTransfer: boolean   // 이전 entry와 venue가 다른가
  availableAt: number   // 이 경기 참여 가능 시각 (분 단위, 이전 경기 종료 + 이동 시간)
}

export interface ItineraryResult {
  entries: ItineraryEntry[]
  totalMoves: number
  uniqueClasses: string[]
  excludedCount: number
}

export interface ItineraryOptions {
  /** 시작 장소. null이면 첫 번째 경기 장소 자동 선택 */
  startVenue: string | null
  /** 대상 클래스 필터. 빈 배열이면 모든 클래스 */
  allowedCategories: string[]
}

export const DEFAULT_ITINERARY_OPTIONS: ItineraryOptions = {
  startVenue: null,
  allowedCategories: [],
}

/** "HH:MM" → 분 단위 정수. 파싱 실패 시 -1 */
export function parseMinutes(time: string): number {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '', 10)
  const m = parseInt(mStr ?? '', 10)
  if (isNaN(h) || isNaN(m)) return -1
  return h * 60 + m
}

/** 분 단위 정수 → "HH:MM" */
export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
