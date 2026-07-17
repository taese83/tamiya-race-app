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
  raceTypes?: string[]
  regions?: string[]
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

/** 신뢰할 수 없는 출처(URL 파람, localStorage)의 설정값을 화이트리스트 검증
 *  파람에 없는 키는 결과 객체에 포함하지 않아 spread 병합 시 기존 값을 덮어쓰지 않는다 */
export function sanitizeSettings(parsed: Record<string, unknown>): SavedSettings {
  const VALID_VIEWS = new Set(['list', 'calendar'])
  const VALID_CVIEWS = new Set(['day', 'week', 'month'])
  const result: SavedSettings = {}
  if (VALID_VIEWS.has(parsed['view'] as string))
    result.view = parsed['view'] as 'list' | 'calendar'
  if (VALID_CVIEWS.has(parsed['cview'] as string))
    result.cview = parsed['cview'] as 'day' | 'week' | 'month'
  if (Array.isArray(parsed['venues']))
    result.venues = (parsed['venues'] as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= 200).slice(0, 50)
  if (Array.isArray(parsed['cats']))
    result.cats = (parsed['cats'] as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= 100).slice(0, 20)
  if (Array.isArray(parsed['raceTypes']))
    result.raceTypes = (parsed['raceTypes'] as unknown[]).filter((x): x is string => ['world', 'asia', 'station'].includes(x as string))
  if (Array.isArray(parsed['regions']))
    result.regions = (parsed['regions'] as unknown[]).filter((x): x is string => ['seoul', 'busan'].includes(x as string))
  return result
}
