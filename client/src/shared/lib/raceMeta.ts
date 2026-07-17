// ─── 대회 유형 ────────────────────────────────────────────────────────────────

export type RaceType = 'world' | 'asia' | 'station'

export function getRaceType(title: string): RaceType {
  const t = title.toUpperCase()
  if (t.includes('TMWC')) return 'world'
  if (t.includes('TMAC')) return 'asia'
  return 'station'
}

export const RACE_TYPE_LABEL: Record<RaceType, string> = {
  world: '월드챌린지',
  asia: '아시아챌린지',
  station: '스테이션',
}

export const RACE_TYPE_COLOR: Record<RaceType, string> = {
  world: '#212121',   // 검은색
  asia: '#212121',    // 검은색
  station: '#37474f', // 회색
}

// ─── 지역 구분 ────────────────────────────────────────────────────────────────

export type Region = 'busan' | 'seoul'

const BUSAN_VENUES = new Set([
  '광복점',
  '김해놀방',
  '부산경기장',
  '부산챔피언서킷',
  '삼정타워점',
  '삼정타워',
  '센텀시티점',
  '센텀시티',
])

export function getRegion(venue: string): Region {
  return BUSAN_VENUES.has(venue) ? 'busan' : 'seoul'
}

export const REGION_LABEL: Record<Region, string> = {
  busan: '부산권',
  seoul: '서울·경기권',
}

// ─── 접수 시작일 / 마감일 파싱 및 상태 판정 ──────────────────────────────────

export type RegistrationStatus =
  | 'today'     // 오늘 접수 시작
  | 'open'      // 접수 중
  | 'closed'    // 접수 마감
  | null        // 날짜 파싱 불가 (현장접수 등)

/**
 * 접수 현황 판정
 * - today: 오늘 = 접수 시작일
 * - open: 시작일 < 오늘 ≤ 마감일
 * - closed: 오늘 > 마감일
 * - null: 날짜 파싱 불가
 */
export function getRegistrationStatus(
  deadline: string,
  raceYear?: number,
): RegistrationStatus {
  if (!deadline) return null
  if (
    deadline.includes('현장') ||
    deadline.includes('당일') ||
    deadline.includes('레이스 시작')
  ) return null

  const year = raceYear ?? new Date().getFullYear()
  const todayStr = formatDateStr(new Date())

  const startStr = parseRegistrationStartDate(deadline, raceYear)
  if (!startStr) return null

  // 마감일 파싱: "~ N월 M일" 또는 "~ Nd일()" 패턴
  // "7월 13일(월) 12:00 ~ 16일(목) 22:00 마감" → 16일은 같은 월
  const startMonth = parseInt(startStr.split('.')[1] ?? '0', 10)
  const endStr = parseRegistrationEndDate(deadline, year, startMonth)

  if (startStr === todayStr) return 'today'
  if (startStr > todayStr) return null  // 아직 시작 안 됨
  if (endStr && todayStr > endStr) return 'closed'
  if (endStr && todayStr <= endStr) return 'open'
  // 마감일 파싱 불가 (시간대만 있는 경우 등) — 시작일이 지났으면 마감으로 처리
  if (todayStr > startStr) return 'closed'
  return null
}

/** 날짜를 "yyyy.MM.dd" 포맷으로 변환 */
function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

/**
 * "~ N월 M일" 또는 "~ Nd일" 패턴에서 마감일 파싱
 * startMonth: 시작월 (마감일이 일(day)만 표기된 경우 같은 달로 처리)
 */
function parseRegistrationEndDate(
  deadline: string,
  year: number,
  startMonth: number,
): string | null {
  // "~" 이후 부분 추출
  const afterTilde = deadline.split('~')[1]
  if (!afterTilde) return null

  // "N월 M일" 패턴
  const fullMatch = afterTilde.match(/(\d{1,2})월\s*(\d{1,2})일/)
  if (fullMatch) {
    const month = parseInt(fullMatch[1] ?? '0', 10)
    const day = parseInt(fullMatch[2] ?? '0', 10)
    if (month && day) return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
  }

  // "Nd일" 패턴 (월 없이 일만 — 시작월과 동일)
  const dayOnlyMatch = afterTilde.match(/^[^0-9]*(\d{1,2})일/)
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1] ?? '0', 10)
    if (day) return `${year}.${String(startMonth).padStart(2, '0')}.${String(day).padStart(2, '0')}`
  }

  return null
}

export const REGISTRATION_STATUS_LABEL: Record<NonNullable<RegistrationStatus>, string> = {
  today: '오늘 접수 시작',
  open: '접수 중',
  closed: '접수 마감',
}

export const REGISTRATION_STATUS_COLOR: Record<NonNullable<RegistrationStatus>, string> = {
  today: '#e65100',   // 주황
  open: '#2e7d32',    // 초록
  closed: '#546e7a',  // 회색
}

// ─── 접수 시작일 파싱 ─────────────────────────────────────────────────────────

/**
 * registrationDeadline 텍스트에서 접수 시작일(yyyy.MM.dd)을 추출한다.
 * 패턴: "N월 M일(...) HH:MM ~ ..." 또는 "N월 M일(...) ~ ..."
 * 연도는 raceYear를 기준으로 추론 (없으면 현재 연도)
 */
export function parseRegistrationStartDate(
  deadline: string,
  raceYear?: number,
): string | null {
  if (!deadline) return null
  // 현장/당일 접수는 날짜 없음
  if (
    deadline.includes('현장') ||
    deadline.includes('당일') ||
    deadline.includes('레이스 시작')
  ) return null

  // "N월 M일" 패턴 추출 (첫 번째 날짜 = 시작일)
  const m = deadline.match(/(\d{1,2})월\s*(\d{1,2})일/)
  if (!m) return null

  const month = parseInt(m[1] ?? '0', 10)
  const day = parseInt(m[2] ?? '0', 10)
  if (!month || !day) return null

  const year = raceYear ?? new Date().getFullYear()
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
}
