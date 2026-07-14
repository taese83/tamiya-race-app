/**
 * 페이지 설정 상태 통합 훅
 *
 * 저장소: localStorage만 사용 — URL은 항상 도메인만 유지 (쿼리파람 없음)
 * 진입 시 localStorage에서 복원, 변경 시 즉시 저장
 *
 * 공유: 공유 버튼 클릭 시에만 현재 설정을 base64로 인코딩해 ?s= 파람 URL 생성
 *       수신자 진입 시 설정 복원 후 URL clean (useEffect에서 처리)
 */
import {useState, useCallback, useEffect} from 'react'
import {decodeSettings, sanitizeSettings} from '@/shared/lib/raceSettings'
import type {SavedSettings, CalendarViewType} from '@/shared/lib/raceSettings'
export type {SavedSettings, CalendarViewType}

const LS_KEY = 'tamiya-race-settings'
const SETTINGS_VERSION = 1

function loadFromStorage(): SavedSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // 버전 불일치 시 초기화
    if (parsed['v'] !== SETTINGS_VERSION) return {}
    return sanitizeSettings(parsed)
  } catch {
    return {}
  }
}

function saveToStorage(settings: SavedSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({...settings, v: SETTINGS_VERSION}))
  } catch {
    // quota exceeded 등 무시
  }
}

function updateStorage(patch: Partial<SavedSettings>): void {
  saveToStorage({...loadFromStorage(), ...patch})
}

/** ?s= 파람이 있으면 디코딩된 설정 반환. 없거나 실패 시 null (side effect 없음) */
function readSharedParam(): SavedSettings | null {
  const params = new URLSearchParams(window.location.search)
  const shared = params.get('s')
  return shared ? decodeSettings(shared) : null
}

const VALID_VIEW_MODES = new Set<'list' | 'calendar'>(['list', 'calendar'])
const VALID_CALENDAR_VIEWS = new Set<CalendarViewType>(['day', 'week', 'month'])

function validViewMode(v: string | undefined): 'list' | 'calendar' {
  return VALID_VIEW_MODES.has(v as 'list' | 'calendar') ? (v as 'list' | 'calendar') : 'list'
}

function validCalendarView(v: string | undefined): CalendarViewType {
  return VALID_CALENDAR_VIEWS.has(v as CalendarViewType) ? (v as CalendarViewType) : 'month'
}

export const usePageSettings = () => {
  // 초기값: ?s= 파람 디코딩 우선, 없으면 localStorage (side effect 없음)
  const [init] = useState<SavedSettings>(() =>
    readSharedParam() ?? loadFromStorage()
  )

  // 마운트 후 1회: ?s= 파람이 있으면 localStorage 저장 + URL clean (render phase 밖)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = params.get('s')
    if (!shared) return
    const decoded = decodeSettings(shared)
    if (decoded) saveToStorage(decoded)
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [])

  const [viewMode, _setViewMode] = useState<'list' | 'calendar'>(() => validViewMode(init.view))
  const [calendarView, _setCalendarView] = useState<CalendarViewType>(() => validCalendarView(init.cview))
  const [selectedVenues, _setSelectedVenues] = useState<string[]>(() => init.venues ?? [])
  const [selectedCategories, _setSelectedCategories] = useState<string[]>(() => init.cats ?? [])

  const setViewMode = useCallback((v: 'list' | 'calendar') => {
    _setViewMode(v)
    updateStorage({view: v})
  }, [])

  const setCalendarView = useCallback((v: CalendarViewType) => {
    _setCalendarView(v)
    updateStorage({cview: v})
  }, [])

  const setSelectedVenues = useCallback((venues: string[]) => {
    _setSelectedVenues(venues)
    updateStorage({venues: venues.length > 0 ? venues : undefined})
  }, [])

  const setSelectedCategories = useCallback((cats: string[]) => {
    _setSelectedCategories(cats)
    updateStorage({cats: cats.length > 0 ? cats : undefined})
  }, [])

  const clearAllFilters = useCallback(() => {
    _setSelectedVenues([])
    _setSelectedCategories([])
    updateStorage({venues: undefined, cats: undefined})
  }, [])

  const currentSettings: SavedSettings = {
    view: viewMode !== 'list' ? viewMode : undefined,
    cview: calendarView !== 'month' ? calendarView : undefined,
    venues: selectedVenues.length > 0 ? selectedVenues : undefined,
    cats: selectedCategories.length > 0 ? selectedCategories : undefined,
  }

  return {
    viewMode,
    setViewMode,
    calendarView,
    setCalendarView,
    selectedVenues,
    setSelectedVenues,
    selectedCategories,
    setSelectedCategories,
    clearAllFilters,
    currentSettings,
  }
}
