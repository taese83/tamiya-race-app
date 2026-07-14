/**
 * 레이스 앱 설정 직렬화 유틸 — features 간 공유
 * features/race-filter 와 features/race-share 양쪽에서 사용
 */

export type CalendarViewType = 'day' | 'week' | 'month'

export interface SavedSettings {
  v?: number
  view?: 'list' | 'calendar'
  cview?: 'day' | 'week' | 'month'
  venues?: string[]
  cats?: string[]
}

/** 현재 설정을 base64로 인코딩 → ?s= 파람 값으로 사용 (한글 안전) */
export function encodeSettings(settings: SavedSettings): string {
  try {
    const json = JSON.stringify(settings)
    const bytes = new TextEncoder().encode(json)
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
    return btoa(binary)
  } catch {
    return ''
  }
}

/** ?s= 파람 값을 디코딩 → SavedSettings. 실패 시 null */
export function decodeSettings(encoded: string): SavedSettings | null {
  try {
    const binary = atob(encoded)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as Record<string, unknown>
    return sanitizeSettings(parsed)
  } catch {
    return null
  }
}

/** 신뢰할 수 없는 출처(URL 파람, localStorage)의 설정값을 화이트리스트 검증 */
export function sanitizeSettings(parsed: Record<string, unknown>): SavedSettings {
  const VALID_VIEWS = new Set(['list', 'calendar'])
  const VALID_CVIEWS = new Set(['day', 'week', 'month'])
  return {
    view: VALID_VIEWS.has(parsed['view'] as string) ? parsed['view'] as 'list' | 'calendar' : undefined,
    cview: VALID_CVIEWS.has(parsed['cview'] as string) ? parsed['cview'] as 'day' | 'week' | 'month' : undefined,
    venues: Array.isArray(parsed['venues'])
      ? (parsed['venues'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined,
    cats: Array.isArray(parsed['cats'])
      ? (parsed['cats'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined,
  }
}
