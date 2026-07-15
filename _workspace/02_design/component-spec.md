# Component Spec — 최적 동선 만들기

## FSD 소유권

| 컴포넌트 | 경로 | 신규/수정 |
|---|---|---|
| `ItineraryButton` | `features/race-itinerary/ui/ItineraryButton.tsx` | 신규 |
| `RouteMapPanel` | `features/race-itinerary/ui/RouteMapPanel.tsx` | 신규 |
| `RouteMapLine` | `features/race-itinerary/ui/RouteMapLine.tsx` | 신규 |
| `RouteStop` | `features/race-itinerary/ui/RouteStop.tsx` | 신규 |
| `TransferSegment` | `features/race-itinerary/ui/TransferSegment.tsx` | 신규 |
| `CalendarDay` | `features/race-calendar/ui/CalendarDay.tsx` | 기존 수정 |
| `RaceTable` | `features/race-list/ui/RaceTable.tsx` | 기존 수정 |

재사용 (변경 없음): `CategoryChip` (`@/entities/race`), `RaceDetailDrawer`

## 내부 타입

```ts
// RouteMapPanel 내부 useMemo용
type RouteItem =
  | { kind: 'segment'; venue: string; venueColor: string; entries: ItineraryEntry[] }
  | { kind: 'transfer'; toVenue: string; toVenueColor: string }
```

---

## 1. ItineraryButton

```ts
interface ItineraryButtonProps {
  races: RaceEntry[]      // 해당 날짜 전체 경기
  dateKey: string         // "yyyy.MM.dd"
  open: boolean
  onOpen: () => void
  onClose: () => void
}
// timedRaces.length < 2 이면 null 반환
```

- `Button size="small"` + `startIcon={<AltRouteIcon />}`
- `variant={open ? 'contained' : 'outlined'}`, `color="primary"`
- `aria-expanded={open}`, `aria-controls="route-map-{dateKey}"`, `aria-label`

---

## 2. RouteMapPanel

```ts
interface RouteMapPanelProps {
  result: ItineraryResult
  dateKey: string
  onRaceClick: (race: RaceEntry) => void
  onClose: () => void
  warningMessage?: string
}
```

렌더 상태:
- `entries.length > 0` → 노선표 렌더
- `excludedCount > 0` → info Alert "시간 미정 N건 제외됨"
- `warningMessage` → warning Alert
- `entries.length === 0` → "최적 동선을 계산할 수 없습니다" 메시지

내부 computed (useMemo):
- `venues`: entries 순회, venue 첫 등장 순
- `venueColorMap`: `getVenueColors(venues)`
- `routeItems: RouteItem[]`: entries → segment/transfer 교차 배열

MUI 구조:
```
Paper (variant="outlined", borderRadius: 2, overflow: 'hidden')
  요약 헤더 Box (position: sticky, top: 0, zIndex: 1, bgcolor: background.paper)
    Typography "총 N경기 · 이동 M회 · 클래스 K종"
    IconButton CloseIcon (aria-label="동선 닫기")
  Alert (info) — excludedCount 있을 때
  Alert (warning) — warningMessage 있을 때
  Box (overflowY: auto, maxHeight: {xs: 60vh, md: 70vh})
    routeItems.map → RouteMapLine | TransferSegment
```

접근성: `role="region"`, `id="route-map-{dateKey}"`, `aria-label="{dateKey} 최적 동선"`

---

## 3. RouteMapLine

```ts
interface RouteMapLineProps {
  venue: string
  venueColor: string    // hex — borderLeft 직접 사용
  entries: ItineraryEntry[]
  onRaceClick: (race: RaceEntry) => void
}
```

```
Box (venue-group)
  Stack (row) — 색상 사각형 인디케이터 + 경기장명 텍스트 (WCAG 1.4.1)
  Box (ul, aria-label="{venue} 정류장", borderLeft: '4px solid {venueColor}', pl: 2)
    Box (li) × N → RouteStop
```

---

## 4. RouteStop

```ts
interface RouteStopProps {
  entry: ItineraryEntry
  venueColor: string
  onClick: () => void
}
```

상태: IDLE → HOVER (`action.hover`) → FOCUS (`outline 2px primary.main`) → PRESSED (`action.selected`)

```
Box (role="button", tabIndex={0}, aria-label="{time} {venue} {category} 경기, 상세 보기")
  onKeyDown: (Enter|Space) && !isComposing → onClick()
  원형 마커 Box (10px, borderRadius 50%, bgcolor: venueColor, ml: -1.75)
  Typography (시간, fontWeight 700, color: primary.main, minWidth: 44)
  CategoryChip (category)
  Typography (caption, 경기장명, flex: 1, truncate)
```

---

## 5. TransferSegment

```ts
interface TransferSegmentProps {
  toVenue: string
  toVenueColor: string   // 하단 점선에 적용
}
```

```
Box (role="separator", aria-label="{toVenue}으로 이동 구간")
  Box — borderTop: '1px dashed', borderColor: divider
  Stack (row, px: 2, py: 1, bgcolor: action.hover)
    DirectionsWalkIcon (aria-hidden)
    Typography caption "→ {toVenue}으로 이동"
  Box — borderTop: '1px dashed', borderColor: toVenueColor, opacity: 0.5
```

대화형 아님: tabIndex 없음, hover/focus 없음

---

## 통합 계약

### CalendarDay 수정
```ts
const [routeMapOpen, setRouteMapOpen] = useState(false)
const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)

// 날짜 변경 시 자동 닫힘
useEffect(() => { setRouteMapOpen(false); setItinerary(null) }, [current])

const handleItineraryOpen = () => {
  setItinerary(computeOptimalItinerary(dayRaces))
  setRouteMapOpen(true)
}
```

렌더 추가:
```tsx
// 날짜 헤더 Stack 끝에
<ItineraryButton races={dayRaces} dateKey={dateKey} open={routeMapOpen}
  onOpen={handleItineraryOpen} onClose={() => setRouteMapOpen(false)} />

// 경기 목록 앞에
<Collapse in={routeMapOpen} unmountOnExit>
  {itinerary && <RouteMapPanel result={itinerary} dateKey={dateKey}
    onRaceClick={onRaceClick} onClose={() => setRouteMapOpen(false)}
    warningMessage={warningMsg} />}
</Collapse>
```

### RaceTable 수정
```ts
const [routeMapOpenDate, setRouteMapOpenDate] = useState<string | null>(null)
const [itineraryMap, setItineraryMap] = useState<Map<string, ItineraryResult>>(new Map())

// 필터 변경 시 자동 닫힘
useEffect(() => { setRouteMapOpenDate(null); setItineraryMap(new Map()) }, [races])
```

날짜 섹션 헤더에 `ItineraryButton` + 섹션 내 `Collapse > RouteMapPanel` 삽입

---

## warningMessage 계산 기준

| 조건 | warningMessage |
|---|---|
| `entries.length === 1 && timedRaces.length >= 2` | "같은 시간대 경기만 있어 1경기만 선택 가능합니다" |
| 그 외 | undefined |

---

## Interaction Matrix

| 상태 | Action | 결과 |
|---|---|---|
| 버튼 노출, 패널 닫힘 | 버튼 클릭/Enter/Space | 알고리즘 실행 → Collapse 오픈 |
| 패널 열림 | 정류장 클릭/Enter/Space | RaceDetailDrawer 오픈 (패널 유지) |
| 패널 열림 | 닫기 버튼 클릭 | Collapse 닫힘 |
| 패널 열림 (CalendarDay) | 날짜 변경 | 패널 자동 닫힘 |
| 패널 열림 (RaceTable) | 필터 변경 | 패널 자동 닫힘 |
| timedRaces < 2 | — | ItineraryButton null (DOM 제거) |
