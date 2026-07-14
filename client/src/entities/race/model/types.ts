export interface RaceEntry {
  id: string
  title: string       // 대회명
  venue: string       // 장소
  date: string        // YYYY.MM.DD
  time: string        // HH:MM
  category: string    // 종목명 (단일 종목)
  detailUrl: string
}

export interface RaceDetail {
  wrId: string
  entranceFee: string           // 참가비
  registrationDeadline: string  // 접수 기한
  registrationMethod: string    // 접수 방법
  inquiry: string               // 문의
  applyUrl: string | null       // 온라인 접수 URL
  applyButtonText: string | null
}

export interface RacesResponse {
  ok: boolean
  data: RaceEntry[]
  count: number
  cachedAt: string
}

export interface RaceDetailResponse {
  ok: boolean
  data: RaceDetail
}
