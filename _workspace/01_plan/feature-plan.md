# Feature Plan — 최적 동선 만들기

## FSD 슬라이스 구조

```
src/features/race-itinerary/
  model/
    types.ts          ← ItineraryEntry, ItineraryResult, TimeSlot
    algorithm.ts      ← computeOptimalItinerary (DP)
    venueColors.ts    ← 경기장별 고유 색상 배정 유틸
  ui/
    ItineraryButton.tsx   ← "동선 만들기" 조건부 버튼
    RouteMapPanel.tsx     ← 노선표 인라인 패널 (Collapse 포함)
    RouteMapLine.tsx      ← 경기장 세로 노선 (정류장 목록)
    RouteStop.tsx         ← 개별 정류장 (클릭 가능)
    TransferSegment.tsx   ← 환승 구간 블록
  index.ts              ← public API
```

## 데이터 모델

```ts
// model/types.ts
export interface TimeSlot {
  time: string          // "HH:MM"
  races: RaceEntry[]    // 같은 시간대 경기들
}

export interface ItineraryEntry {
  race: RaceEntry
  isTransfer: boolean   // 이전 정류장과 venue가 다른가
}

export interface ItineraryResult {
  entries: ItineraryEntry[]
  totalMoves: number        // 장소 이동 횟수
  uniqueClasses: string[]   // 참여 클래스 목록
  excludedCount: number     // time='' 제외된 경기 수
}
```

## 알고리즘 설계 (model/algorithm.ts)

```
입력: RaceEntry[]
1. time='' 항목 분리 → excludedCount
2. time 기준 슬롯 그룹핑: Map<time, RaceEntry[]>
3. 슬롯 시간 오름차순 정렬
4. DP
   state: dp[슬롯idx][venueIdx][classBitmask] = maxScore
   score = 참여수×100 - 이동횟수×10 + 고유클래스수×5
5. 역추적으로 선택된 RaceEntry[] 복원
6. ItineraryResult 반환
```

**클래스 bitmask 매핑** (CLASS_LIST 순서):
- 0: M-SPEED (index 0)
- 1: M1 (index 1)
- 2: M2B (index 2)
- 3: M2 (index 3)
- 4: M3 (index 4)
- 5: OPEN (index 5)

## 컴포넌트 Props

```ts
// ItineraryButton
interface ItineraryButtonProps {
  races: RaceEntry[]       // 해당 날짜 전체 경기
  dateKey: string          // "yyyy.MM.dd" — aria-controls 용
  open: boolean
  onOpen: () => void
  onClose: () => void
}
// time 있는 경기 수 < 2이면 null 반환

// RouteMapPanel
interface RouteMapPanelProps {
  result: ItineraryResult
  dateKey: string
  onRaceClick: (race: RaceEntry) => void
  onClose: () => void
}

// RouteStop
interface RouteStopProps {
  entry: ItineraryEntry
  venueColor: string
  onClick: () => void
}

// TransferSegment
interface TransferSegmentProps {
  toVenue: string
}
```

## 통합 지점 (최소 변경)

### CalendarDay
- `routeMapOpen`, `itinerary` 상태 추가
- 날짜 헤더 Stack에 `<ItineraryButton>` 추가
- 경기 목록 위에 `<Collapse><RouteMapPanel /></Collapse>` 삽입
- `useEffect([current])` → 날짜 변경 시 자동 닫힘

### RaceTable (리스트 뷰 날짜 섹션)
- `routeMapOpenDate: string | null` 상태 추가
- 날짜 섹션 헤더에 `<ItineraryButton>` 추가
- 섹션 내 `<Collapse><RouteMapPanel /></Collapse>` 삽입
- `useEffect([races])` → 필터 변경 시 자동 닫힘

## 경기장 색상 배정 (venueColors.ts)

```ts
const VENUE_COLOR_PALETTE = [
  '#1565c0', // 파랑
  '#2e7d32', // 초록
  '#e65100', // 주황
  '#6a1b9a', // 보라
  '#ad1457', // 핑크
  '#00695c', // 청록
  '#4527a0', // 남보라
  '#546e7a', // 회색 (fallback)
]
// venues 배열에서 등장 순서대로 배정
export function getVenueColors(venues: string[]): Map<string, string>
```

## public API (index.ts)

```ts
export {computeOptimalItinerary} from './model/algorithm'
export {getVenueColors} from './model/venueColors'
export type {ItineraryEntry, ItineraryResult} from './model/types'
export {ItineraryButton} from './ui/ItineraryButton'
export {RouteMapPanel} from './ui/RouteMapPanel'
```

## ALLOWED_PATHS (change-scope)
```
src/features/race-itinerary/           ← 신규 슬라이스 (전체)
src/features/race-calendar/ui/CalendarDay.tsx  ← 버튼+패널 삽입
src/features/race-list/ui/RaceTable.tsx        ← 버튼+패널 삽입
```

## NON_GOALS
- RaceDetailDrawer 수정 없음 (onRaceClick 콜백 재사용)
- CalendarMonth / CalendarWeek 수정 없음
- 기존 필터/상태 관리 변경 없음
- localStorage 저장 없음
