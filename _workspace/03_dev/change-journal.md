# Change Journal — Race Favorites

CHANGE_MODE: existing-change
REQUEST_TYPE: feature
LOCAL_DOMAIN_STATE_MODE: true
Base commit: 4575d57

## web-orchestrator — Phase 3 구현
- CREATED: client/src/shared/lib/favoritesDb.ts — IndexedDB open/getAll/add/remove helpers (private mode fallback 포함)
- CREATED: client/src/features/race-favorite/model/useFavorites.ts — Set mirror + BroadcastChannel + window focus refresh
- CREATED: client/src/features/race-favorite/ui/FavoriteToggle.tsx — MUI IconButton (FlagOutlined / Flag)
- CREATED: client/src/features/race-favorite/index.ts — feature public API
- MODIFIED: client/src/shared/lib/raceSettings.ts — SavedSettings에 onlyFavorites boolean 추가, sanitize 통과 조건 boolean 한정
- MODIFIED: client/src/features/race-filter/model/usePageSettings.ts — onlyFavorites state/setter 추가, 공유 파람 병합 시 onlyFavorites은 배제
- MODIFIED: client/src/features/race-list/ui/RaceDetailDrawer.tsx — 헤더 좌측에 FavoriteToggle 삽입
- MODIFIED: client/src/pages/RaceListPage.tsx — AppBar에 상위 즐겨찾기 토글, filteredRaces 파이프라인에 favorites 게이팅, 즐겨찾기 0개 빈 상태 안내

## Preserved public contracts
- RaceEntry / RACES_QUERY_KEY / fetchRaces (변경 없음)
- SavedSettings 공유 URL: 기존 6개 필드는 유지, onlyFavorites은 encodeSettings 대상에서 제외
- RaceDetailDrawer 외부 props (race, onClose) 변경 없음
- RaceFilter props 변경 없음
- react-router BrowserRouter 및 라우팅 없음 유지

## Non-goals (합의된 미수행)
- 서버 크롤링 로직 변경 없음
- races.json 스키마 변경 없음
- 즐겨찾기 export/import/공유 URL 전파 없음
- 즐겨찾기 그룹핑/노트/폴더 없음
- 로그인 · 원격 동기화 없음

## Evidence
- typecheck: `pnpm --filter client typecheck` → PASS
- build: `pnpm --filter client build` → 1901 modules transformed, built in 4.33s
- bundle warning (722KB > 500KB)는 기존 상태로, 이번 change와 무관 (기존 MUI/react-query 번들 크기)

## Verification Matrix 결과 (요구사항 ID ↔ 증거)
| ID | Requirement | Manual QA | 상태 |
|---|---|---|---|
| R1 | 상세 헤더 깃발 클릭 저장 | 사용자 브라우저 확인 필요 | 미실시 (dev server) |
| R2 | 필터 상위 토글 (AppBar) | 사용자 브라우저 확인 필요 | 미실시 |
| R3 | favorites ∩ user filters | 사용자 브라우저 확인 필요 | 미실시 |
| R4 | 빈 상태 안내 | 사용자 브라우저 확인 필요 | 미실시 |
| R5 | 캘린더 뷰 반영 | 사용자 브라우저 확인 필요 | 미실시 |
| R6 | localStorage v1→v2 하위 호환 | 코드 리뷰로 검증: sanitize는 alien 값 무시, 기존 필드 보존 | 코드 검증 완료 |
| R7 | IndexedDB 접근 실패 fallback | 코드 리뷰로 검증: favoritesDb 모두 try/catch, null return | 코드 검증 완료 |

브라우저 수동 QA는 dev server (`pnpm --filter client dev`)에서 사용자가 최종 확인해야 한다.

## web-orchestrator — 디자인 후속 조정 (ui-change)
REQUEST_TYPE: ui-change (아이콘 교체 + spacing)
- MODIFIED: client/src/features/race-favorite/ui/FavoriteToggle.tsx — Flag / FlagOutlined → TurnedIn / TurnedInNot
- MODIFIED: client/src/pages/RaceListPage.tsx
  - AppBar 즐겨찾기 아이콘 Flag → TurnedIn 계열로 교체
  - 빈 상태 안내 아이콘도 동일하게 TurnedInNot으로 교체 (톤 일관성)
  - Toolbar `gap: 0.75` → `gap: 1.25` (아이콘 간 시각적 여유 확보)

EVIDENCE:
- typecheck: `pnpm --filter client typecheck` → PASS
- build: `pnpm --filter client build` → PASS (1901 modules, 3.86s)

## web-orchestrator — AppBar UX 재조정 (ui-change)
REQUEST_TYPE: ui-change (spacing/grouping)
- MODIFIED: client/src/pages/RaceListPage.tsx
  - Toolbar gap: 1.25 → 1 (그룹 내 tight, 그룹 사이는 Divider로 시각 분리)
  - 즐겨찾기 + 필터를 Stack (gap 0.25)으로 묶어 "스코프" 그룹으로 시각화
  - 스코프 그룹 / 뷰 전환 ToggleButtonGroup / ShareButton 사이에 vertical Divider 삽입
  - MUI Divider 컴포넌트 import 추가

Rationale:
- 이전: 모든 icon이 균일 gap으로 나열되어 개념 그룹(스코프 / 뷰 / 액션)이 시각적으로 구분되지 않음
- 이후: 관련된 컨트롤은 붙이고, 다른 개념 사이는 divider로 breathing space 확보 → 클릭 대상 예측이 쉬워짐

EVIDENCE:
- typecheck: PASS
- build: PASS (1901 modules, 3.57s)

## web-orchestrator — Visual indicator + Bulk clear (feature)
REQUEST_TYPE: feature
LOCAL_DOMAIN_STATE_MODE: true (bulk clear는 destructive → confirm dialog)

- CREATED: client/src/features/race-favorite/ui/FavoriteIndicator.tsx — read-only 시각 인디케이터 (size/tone/cornerAbsolute 옵션)
- MODIFIED: client/src/shared/lib/favoritesDb.ts — clearAllFavorites 추가
- MODIFIED: client/src/features/race-favorite/model/useFavorites.ts — clearAll command + count 노출
- MODIFIED: client/src/features/race-favorite/index.ts — FavoriteIndicator 재수출
- MODIFIED: client/src/features/race-list/ui/RaceTable.tsx — desktop 종목 셀과 mobile 카드 title 라인에 indicator
- MODIFIED: client/src/features/race-calendar/ui/CalendarDay.tsx — title 라인에 indicator
- MODIFIED: client/src/features/race-calendar/ui/CalendarWeek.tsx — Box relative + corner absolute indicator
- MODIFIED: client/src/features/race-calendar/ui/CalendarMonth.tsx
  - RaceRow: corner absolute 흰색 아이콘 (size 10)
  - MobileRaceChip: corner absolute 흰색 아이콘 (size 8)
  - MobileRaceRow (Drawer): CategoryChip 옆 (size 14)
  - DrawerRaceMatrix: 매트릭스 셀에 corner absolute (size 9)
  - 상위 CalendarMonth에서 useFavorites 호출, DayCellDesktop/Mobile/DrawerRaceMatrix에 isFavorite predicate prop drilling
- MODIFIED: client/src/pages/RaceListPage.tsx
  - AppBar 즐겨찾기 IconButton에 favoriteCount Badge
  - 필터 collapse 오른쪽 사이드에 "즐겨찾기 N건 전체 해제" 버튼 (favoriteCount>0일 때만)
  - Confirm Dialog + clearAllFavorites 호출

## Preserved public contracts
- RaceEntry / RACES_QUERY_KEY / fetchRaces 변경 없음
- SavedSettings 공유 URL 계약 변경 없음
- 각 캘린더/테이블 컴포넌트의 외부 props (races, onRaceClick 등) 변경 없음

## Rationale
- FavoriteIndicator는 IconButton이 아니라 시각 지시만 담당해 셀 클릭 이벤트와 간섭하지 않는다 (pointerEvents: none)
- CalendarMonth의 색상 배경 셀에는 흰색 아이콘을 corner absolute로 배치해 기존 layout(장소 2줄 클램프, 시간 라인)을 변경하지 않는다
- CalendarMonth 하위 컴포넌트 4개가 파일 내부 함수라 각각 useFavorites를 부르는 대신 상위에서 한 번 호출하고 predicate로 넘긴다 — IDB open을 인스턴스 수만큼 반복하지 않음
- Bulk clear는 confirm Dialog로 오조작 방지, undo 미제공 (change-scope non-goals)

EVIDENCE:
- typecheck: PASS
- build: PASS (1902 modules, 4.49s)

## web-orchestrator — UI 개선 (ui-change): 상세보기 제거 · 필터 Popover · 즐겨찾기 발견성
REQUEST_TYPE: ui-change

- MODIFIED: client/src/features/race-list/ui/RaceTable.tsx
  - "상세보기" 하단 Stack 제거 (desktop 종목 셀의 InfoOutlinedIcon, mobile 카드 하단 라인)
  - 목록 상단 안내문 "행 클릭 시 상세 정보(참가비·접수방법)를 확인할 수 있습니다" 제거
  - 사용하지 않는 InfoOutlinedIcon import 제거
- MODIFIED: client/src/features/race-calendar/ui/CalendarDay.tsx
  - Paper 카드 하단 "상세보기" Stack + InfoOutlinedIcon 제거, CategoryChip만 남김
- MODIFIED: client/src/pages/RaceListPage.tsx
  - Filter Collapse → Popover 전환 (AppBar 밀어내리지 않고 오버레이). anchorEl 기반 상태
  - Popover 상단에 즐겨찾기 섹션 명시 (아이콘 + "즐겨찾기 N건" + 우측 "전체 해제" 텍스트 버튼, count=0면 disabled)
  - 활성 필터가 있을 때만 하단에 "N건 표시" + "필터 전체 해제" 표시
  - Collapse/Paper 관련 import 제거, Popover 추가

## Preserved
- 다른 파일의 `aria-label="{venue} 접수 상세 보기"` 등은 접근성 label이므로 유지 (사용자 노출 UI 아님)
- RaceDetailDrawer의 InfoOutlinedIcon (경기 note 경고 배너)과 NaverCalendarDrawer의 "이용 안내" 아이콘은 상세보기 지시와 무관하므로 유지
- 즐겨찾기 자체 배지·아이콘·bulk clear confirm dialog는 변경 없음

## Rationale
- 상세보기 유도 문구는 카드/행 자체가 클릭 가능하다는 걸 아이콘 + 텍스트 두 번 반복해 표시하고 있어 UI 중복. 제거하면 CategoryChip과 시간·정보 자체가 clarity 유지
- Filter Collapse는 AppBar sticky 아래에 붙어 스크롤 컨텐츠를 밀어내렸음. Popover는 안전 영역 안에서 float하므로 컨텐츠 layout이 흔들리지 않고 backdrop click으로 즉시 닫힘
- 이전에는 필터 collapse 오른쪽 사이드에 clear-all 버튼이 숨어 있어 발견성이 낮았음. Popover 상단에 별도 섹션으로 명시 → 즐겨찾기가 filter의 상위 개념임을 시각적으로도 표현

EVIDENCE:
- typecheck: PASS
- build: PASS (1902 modules, 3.80s)

## web-orchestrator — UI 개선 (ui-change): 컨텐츠 폭 정렬 + 필터 중복 제거
REQUEST_TYPE: ui-change

- MODIFIED: client/src/features/race-filter/ui/RaceFilter.tsx
  - "필터 전체 초기화" 버튼과 clearAll 로직, hasFilter 계산, ClearIcon/Button import 제거
  - 사유: 이 버튼과 Popover 하단 "필터 전체 해제"가 동일하게 4개 필터 배열을 [] 로 초기화 — 중복 액션
- MODIFIED: client/src/pages/RaceListPage.tsx
  - Toolbar sx에 `maxWidth: {xs: '100%', sm: viewMode === 'calendar' ? 1100 : 900}` + `mx: 'auto'` 적용 (AppBar sticky는 유지, 내부 Toolbar만 컨텐츠 폭과 정렬)
- MODIFIED: client/src/features/race-calendar/ui/CalendarMonth.tsx
  - Bottom Drawer paper sx에 `maxWidth: {xs: '100%', sm: 1100}` + `left: 50%` + `transform: translateX(-50%)` 적용해 데스크탑에서 캘린더 컨텐츠 폭(1100)과 정렬
  - 모바일에서는 기존 100vw · 좌우 여백 없이 그대로 유지

## Rationale
- AppBar는 sticky 배경/border를 화면 전체로 유지해야 하므로 AppBar 자체가 아닌 내부 Toolbar에 maxWidth를 걸어 컨텐츠 정렬을 만든다 (Material UI 표준 패턴)
- Bottom Drawer는 캘린더 뷰에서만 열리므로 캘린더의 컨텐츠 max-width(1100)와 정렬. 리스트 뷰에서는 열리지 않아 900에 맞출 필요 없음
- "필터 전체 초기화" · "필터 전체 해제" 두 버튼 모두 4개 필터 setter를 [] 로 호출하므로 semantic 완전 동일 — Popover 오버레이 재구성 후 발견성이 확보된 하단 버튼만 남기고 RaceFilter 내부의 중복 UI 제거

EVIDENCE:
- typecheck: PASS
- build: PASS (1901 modules, 3.66s)

