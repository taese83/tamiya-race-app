export interface CalendarSource {
  id: string
  name: string
  color: string
  url: string
  eventCount?: number
  lastSynced?: string
  error?: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string       // YYYY.MM.DD (DTSTART, KST 기준)
  endDate?: string   // YYYY.MM.DD (종일 이벤트: DTEND -1일 보정)
  time?: string      // HH:MM (allDay=true이면 undefined)
  endTime?: string   // HH:MM
  allDay: boolean
  location?: string
  description?: string
  sourceId: string   // CalendarSource.id
  color: string      // CalendarSource.color 복사
}

export interface ICalSettings {
  sources: CalendarSource[]
}

/** @deprecated use ICalSettings */
export type NaverCalendarSettings = ICalSettings

export const CALENDAR_COLORS = [
  '#1e88e5', // 파랑
  '#8e24aa', // 보라
  '#43a047', // 초록
  '#f4511e', // 빨강
  '#fb8c00', // 주황
  '#757575', // 회색
] as const

export type CalendarColor = typeof CALENDAR_COLORS[number]
