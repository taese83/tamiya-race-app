import type {RaceEntry} from '@/entities/race'
import {CLASS_LIST} from '@/entities/race'
import type {ItineraryEntry, ItineraryResult, ItineraryOptions} from './_types'
import {parseMinutes} from './_types'

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** 경기 최소 지속 시간 (분) */
const RACE_DURATION_MIN = 60

/**
 * 장소 간 이동 소요 시간 근사 (분)
 * 실제 지도 API 없으므로 같은 장소=0, 다른 장소=30분 고정 근사
 */
const TRANSFER_TIME_MIN = 30

// ─── 유틸 ────────────────────────────────────────────────────────────────────

const CLASS_KEYS = CLASS_LIST.map(c => c.key)

function categoryMatches(category: string, allowedCategories: string[]): boolean {
  if (allowedCategories.length === 0) return true
  return allowedCategories.some(allowed => category.includes(allowed))
}

function getUniqueClasses(entries: ItineraryEntry[]): string[] {
  const found = new Set<string>()
  for (const {race} of entries) {
    const key = CLASS_KEYS.find(k => race.category.includes(k))
    if (key) found.add(key)
  }
  return Array.from(found)
}

// ─── 핵심 알고리즘 ────────────────────────────────────────────────────────────

/**
 * 시작 장소 우선 그리디 동선 계산
 *
 * 규칙:
 * 1. 경기 지속 60분 — 이전 경기 시작 후 60분이 지나야 다음 경기 참여 가능
 * 2. 같은 장소 → 이동 시간 0분, 다른 장소 → 이동 시간 30분
 * 3. 현재 위치에서 `availableAt` 이후 시작하는 경기 중 선택:
 *    a. 현재 장소에서 진행되는 경기 우선 (이동 비용 0)
 *    b. 동점이면 새 클래스를 추가하는 경기 우선
 *    c. 그래도 동점이면 시간 오름차순
 * 4. 선택 불가 시 종료
 */
export function computeOptimalItinerary(
  races: RaceEntry[],
  options: ItineraryOptions = {startVenue: null, allowedCategories: []},
): ItineraryResult {
  const {startVenue, allowedCategories} = options

  // 1. time='' 항목 분리 + 클래스 필터 적용
  const allTimedRaces = races.filter(r => r.time && r.time.trim() !== '')
  const excludedCount = races.length - allTimedRaces.length

  const filteredRaces = allowedCategories.length > 0
    ? allTimedRaces.filter(r => categoryMatches(r.category, allowedCategories))
    : allTimedRaces

  if (filteredRaces.length === 0) {
    return {entries: [], totalMoves: 0, uniqueClasses: [], excludedCount}
  }

  // 2. 시간(분) 파싱
  const racesByTime = filteredRaces
    .map(r => ({race: r, startMin: parseMinutes(r.time)}))
    .filter(r => r.startMin >= 0)
    .sort((a, b) => a.startMin - b.startMin)

  if (racesByTime.length === 0) {
    return {entries: [], totalMoves: 0, uniqueClasses: [], excludedCount}
  }

  // 3. 시작 장소 결정
  // startVenue가 지정되면 해당 장소의 첫 경기부터, 없으면 전체 첫 경기 장소 사용
  const initialVenue = startVenue
    ?? racesByTime.find(r => !startVenue || r.race.venue === startVenue)?.race.venue
    ?? racesByTime[0]!.race.venue

  // 4. 그리디 반복
  const entries: ItineraryEntry[] = []
  const selectedIds = new Set<string>()
  const seenClasses = new Set<string>()

  let currentVenue = initialVenue
  // 현재 가용 시각 = 첫 경기는 제약 없음 (0분)
  let availableAt = 0
  let totalMoves = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 현재 가용 시각 이후 시작, 미선택 경기 후보
    const candidates = racesByTime.filter(
      r => !selectedIds.has(r.race.id) && r.startMin >= availableAt
    )

    if (candidates.length === 0) break

    // 이동 시간 계산: 같은 장소 0분, 다른 장소 30분
    const withCost = candidates.map(r => ({
      ...r,
      travelMin: r.race.venue === currentVenue ? 0 : TRANSFER_TIME_MIN,
    }))

    // 이동 후 도착 가능한 후보만 (도착 시각 ≤ 경기 시작)
    const reachable = withCost.filter(r => availableAt + r.travelMin <= r.startMin)

    if (reachable.length === 0) break

    // 우선순위 점수 계산:
    //   이동 비용이 0인 경우(같은 장소) 우선 → travelMin 오름차순
    //   신규 클래스 추가 여부 → 1점
    //   시간 오름차순 (빠른 것 우선)
    const scored = reachable.map(r => {
      const classKey = CLASS_KEYS.find(k => r.race.category.includes(k))
      const isNewClass = classKey ? !seenClasses.has(classKey) : false
      return {
        ...r,
        priority: r.travelMin * 1000 - (isNewClass ? 500 : 0) + r.startMin,
      }
    })

    scored.sort((a, b) => a.priority - b.priority)

    const chosen = scored[0]!
    const isTransfer = chosen.race.venue !== currentVenue

    entries.push({
      race: chosen.race,
      isTransfer,
      availableAt,
    })

    selectedIds.add(chosen.race.id)
    if (isTransfer) totalMoves++

    const classKey = CLASS_KEYS.find(k => chosen.race.category.includes(k))
    if (classKey) seenClasses.add(classKey)

    currentVenue = chosen.race.venue
    // 다음 가용 시각 = 이 경기 시작 + 60분
    availableAt = chosen.startMin + RACE_DURATION_MIN
  }

  return {
    entries,
    totalMoves,
    uniqueClasses: getUniqueClasses(entries),
    excludedCount,
  }
}
