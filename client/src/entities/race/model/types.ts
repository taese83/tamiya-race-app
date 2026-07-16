export interface RaceEntry {
  id: string
  title: string
  venue: string
  date: string                        // YYYY.MM.DD
  time: string                        // HH:MM
  category: string                    // () 제거된 순수 클래스명
  note: string                        // () 안 부연설명 (예: 선착순 45명 / 매장 오픈 10:30)
  detailUrl: string
  registrationStartDate?: string      // YYYY.MM.DD — 별도 접수 시작일 (현장 접수는 없음)
  registrationDeadlineRaw?: string    // 원본 마감일 텍스트 — 접수 상태 판정용
}

export interface RaceDetail {
  wrId: string
  entranceFee: string
  registrationDeadline: string
  registrationMethod: string
  inquiry: string
  applyUrl: string | null
  applyButtonText: string | null
}

export interface RacesResponse {
  ok: boolean
  data: RaceEntry[]
  details: Record<string, RaceDetail>  // wrId → 상세 정보
  count: number
  cachedAt: string
}

export interface RaceDetailResponse {
  ok: boolean
  data: RaceDetail
}
