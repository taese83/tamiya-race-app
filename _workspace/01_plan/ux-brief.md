# UX Brief — 최적 동선 만들기 (노선표 UI)

## 핵심 설계 결정

### 레이아웃 방식
- **모바일 (360~959px)**: 단일 컬럼 + 좌측 3px 컬러 바로 경기장 구분. 환승은 전폭 블록
- **데스크탑 (≥960px)**: CSS Grid로 경기장 수만큼 컬럼 분기 (최대 4컬럼, 초과 시 가로 스크롤)
- 모바일에서 다중 컬럼 불채택 이유: CategoryChip + 시간 + 경기장명이 150px 내 수용 불가

### 표시 방식: 인라인 Collapse 패널
- 드로어/모달 불채택: 기존 `RaceDetailDrawer(anchor="right")` 와 z-index 충돌, 날짜 맥락 단절
- MUI `Collapse` 인라인 삽입 → 날짜 맥락 유지, 닫기로 원래 목록 복원

### 환승 시각화
```
  ┃  (경기장 A 컬러 바)
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  [action.hover 배경]  🚶 다음 경기장으로 이동
  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  ┃  (경기장 B 컬러 바)
```
- `border: '1px dashed'` + `borderColor: 'divider'`
- `DirectionsWalkIcon` + "→ {경기장명}으로 이동" 텍스트
- 곡선 SVG 불채택 (MUI 스타일 시스템 충돌)

## 화면 인벤토리

| 화면 | 변경 유형 | 핵심 추가 내용 |
|---|---|---|
| CalendarDay | 기존 수정 | 날짜 헤더에 동선 버튼 + RouteMapPanel Collapse 슬롯 |
| RaceTable | 기존 수정 | 날짜 섹션 헤더에 동선 버튼 + 섹션 내 RouteMapPanel Collapse |
| RouteMapPanel | **신규** | 노선표 인라인 패널 |
| RaceDetailDrawer | 수정 없음 | 정류장 클릭 시 기존 드로어 재사용 |

## 모바일 레이아웃 (단일 컬럼)
```
┌─────────────────────────────────┐
│ 총 4경기 · 이동 2회 · 클래스 3종 [×] │  ← sticky 요약 헤더
├─────────────────────────────────┤
│ [■ 경기장 A]                     │  ← 경기장 헤더 Chip
│ ┃  ◉  11:00  [M3]  경기장 A    │  ← 정류장 (role="button")
│ ┃  ◉  14:00  [M1]  경기장 A    │
│   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ← 환승 상단 점선
│   [action.hover]  🚶 경기장 B   │  ← 환승 블록
│   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ← 환승 하단 점선
│ [■ 경기장 B]                     │
│ ┃  ◉  15:30  [M2B] 경기장 B   │
│ ┃  ◉  17:00  [OPEN] 경기장 B  │
└─────────────────────────────────┘
```

## 상태 관리 (메모리 전용, localStorage 쓰기 없음)

**CalendarDay 내**:
```ts
const [routeMapOpen, setRouteMapOpen] = useState(false)
const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)
// 날짜 변경 시 자동 닫힘
useEffect(() => { setRouteMapOpen(false) }, [current])
```

**RaceTable 내**:
```ts
const [routeMapOpenDate, setRouteMapOpenDate] = useState<string | null>(null)
// 필터 변경 시 자동 닫힘
useEffect(() => { setRouteMapOpenDate(null) }, [races])
```

## 접근성
- RouteMapPanel: `role="region"` + `aria-label="{날짜} 최적 동선"` + `id="route-map-{dateKey}"`
- 동선 버튼: `aria-expanded` + `aria-controls="route-map-{dateKey}"`
- 정류장: `aria-label="{시간} {경기장} {클래스} 경기, 상세 보기"`
- 환승 블록: `role="separator"` + `aria-label="경기장 이동 구간"`
- 컬러 바에 경기장명 헤더 병행 (WCAG 1.4.1 색상만으로 구분 금지)
