# Change Scope — Race Favorites Feature

CHANGE_MODE: existing-change
REQUEST_TYPE: feature
LOCAL_DOMAIN_STATE_MODE: true

## REQUEST
경기 상세페이지 상단 왼쪽에 깃발 아이콘을 배치해 해당 경기를 즐겨찾기에 추가/해제할 수 있고, 필터 바의 "즐겨찾기만" 토글을 켜면 리스트/캘린더/공유 등 모든 파생 뷰가 즐겨찾기 대상 경기만 기준으로 동작한다.

## OBSERVED_BASELINE
- `pages/RaceListPage.tsx` — `filteredRaces` useMemo에서 venue/category/raceType/region 4축 필터만 적용
- `features/race-list/ui/RaceDetailDrawer.tsx` — 우측 Drawer, 헤더에 카테고리 chip + 제목 + 닫기 버튼. 즐겨찾기 UI 없음
- `features/race-filter/ui/RaceFilter.tsx` — 4축 ToggleButtonGroup + venue Autocomplete. 즐겨찾기 진입점 없음
- persistence: `usePageSettings` + `useNaverCalendar`가 localStorage `tamiya-*` 프리픽스로 저장. IndexedDB 미사용
- Race 고유 식별자: `RaceEntry.id: string` (예: `${wrId}-${classIdx}`), 클래스 단위 즐겨찾기 가능

## TARGET_BEHAVIOR
1. RaceDetailDrawer 헤더 상단 왼쪽에 깃발 IconButton (outline / filled 두 상태) 표시. 클릭 시 IndexedDB에 race.id 저장/삭제
2. **즐겨찾기 토글은 필터의 상위 개념** — AppBar 또는 페이지 상단(필터 아이콘/뷰 토글 위쪽 라인)에 별도 ToggleButton으로 배치. RaceFilter 컴포넌트 내부에는 두지 않는다
3. 파이프라인 순서는 **base races → 즐겨찾기 게이팅(활성 시) → 사용자 필터(venue/category/raceType/region)** — 즐겨찾기가 상위 base set을 좁히고, 그 위에 기존 필터가 그대로 동작
4. onlyFavorites=true이면 filteredRaces의 입력 base가 favorites 집합으로 바뀌고, 그 위에서 venue/category/raceType/region 필터가 그대로 적용
5. filteredRaces에 의존하는 모든 파생 뷰 (RaceTable 리스트, RaceCalendar, TodayRaceHeader, RegistrationDrawer)가 자동으로 좁혀진 집합을 사용
6. 빈 상태:
   - onlyFavorites=true이고 즐겨찾기 0개: "즐겨찾기한 경기가 없습니다. 상세페이지에서 깃발을 눌러 추가하세요."
   - onlyFavorites=true이고 즐겨찾기는 있지만 사용자 필터로 0개: 기존 "조건에 맞는 경기가 없습니다" 메시지 그대로
7. cross-tab: IndexedDB 변경 시 storage event가 없으므로 BroadcastChannel 또는 최소한 window focus 시 재조회로 처리

## ALLOWED_PATHS
### CREATE
- `client/src/shared/lib/favoritesDb.ts` — IndexedDB open/get/put/delete helpers
- `client/src/features/race-favorite/index.ts` — public API
- `client/src/features/race-favorite/model/useFavorites.ts` — React hook wrapping IndexedDB
- `client/src/features/race-favorite/ui/FavoriteToggle.tsx` — 깃발 IconButton

### MODIFY
- `client/src/features/race-list/ui/RaceDetailDrawer.tsx` — 헤더에 FavoriteToggle 삽입 (헤더 layout 최소 변경)
- `client/src/features/race-filter/model/usePageSettings.ts` — onlyFavorites 상태만 추가 (localStorage v 2 migration)
- `client/src/pages/RaceListPage.tsx` — AppBar/헤더 라인에 상위 즐겨찾기 토글 추가, filteredRaces 파이프라인 (favorites 게이팅 → 필터) 및 빈 상태 분기 렌더

### NOT MODIFIED (원칙)
- `client/src/features/race-filter/ui/RaceFilter.tsx` — 즐겨찾기는 필터의 상위 개념이므로 이 컴포넌트 내부에는 두지 않는다. props/UI 변경 없음

## PUBLIC_CONTRACTS_TO_PRESERVE
- `RaceEntry` 도메인 타입 (변경 없음)
- `RACES_QUERY_KEY`, `fetchRaces` 계약 (변경 없음)
- `SavedSettings` share URL 계약 (encodeSettings/decodeSettings) — onlyFavorites은 개인 기기 상태이므로 공유 URL 화이트리스트에 포함하지 않음
- MUI theme, ThemeProvider tree, react-router BrowserRouter (변경 없음)
- `RaceDetailDrawer` props (`race: RaceEntry | null`, `onClose`) — 변경 없음
- `RaceFilter` props — 변경 없음 (즐겨찾기 토글은 상위 계층에 위치)

## NON_GOALS
- 서버 크롤링 로직 변경 없음
- races.json 스키마 변경 없음
- react-router `<Routes>` 도입 (여전히 단일 페이지)
- 즐겨찾기 그룹핑/폴더/노트 기능
- 즐겨찾기 export/import UI
- 로그인 · 원격 동기화
- 기존 필터 UX 재구성

## CHANGE_BUDGET
- 새 파일 4개 (favoritesDb, useFavorites, FavoriteToggle, index.ts)
- 수정 4개 (RaceDetailDrawer, RaceFilter, usePageSettings, RaceListPage)
- dependency 추가 없음 (idb 라이브러리 대신 native indexedDB wrapper 최소 구현)
- localStorage 스키마 마이그레이션: v1 → v2 (onlyFavorites 필드 추가, 기존 값 그대로 유지)

## TEST_EVIDENCE
- typecheck: `pnpm --filter client typecheck`
- build: `pnpm --filter client build`
- 수동 확인
  1. 상세 Drawer 열고 깃발 클릭 → filled 상태 전환, 재접속 후 유지
  2. 페이지 상단(필터 위) 즐겨찾기 토글 켜기 → 리스트가 즐겨찾기 base로 좁혀짐
  3. 즐겨찾기 0개 상태에서 토글 켜기 → "즐겨찾기한 경기가 없습니다" 안내 노출
  4. 즐겨찾기 base 위에서 venue/category 필터를 추가로 적용 → 두 조건 AND (favorites ∩ filter)
  5. 캘린더 뷰에서도 즐겨찾기 토글이 즉시 반영 (같은 filteredRaces 사용)
  6. localStorage에 이전 v1 값이 있을 때 refresh → 크래시 없이 v2로 흡수, onlyFavorites=false

## Extension — Visual Indicator + Bulk Clear (this iteration)

### TARGET_BEHAVIOR (추가)
8. 리스트(RaceTable desktop/mobile)와 캘린더 각 뷰(Day/Week/Month, Month Drawer/Matrix)의 개별 race 셀에 즐겨찾기 상태를 시각적으로 표시한다. 넉넉한 뷰는 아이콘 옆, 좁은 색상 배경 셀은 우측 상단 코너에 흰색 소형 아이콘.
9. AppBar 즐겨찾기 IconButton에 현재 즐겨찾기 개수 badge를 붙인다 (기존 filter badge와 시각 언어 일치).
10. 필터 collapse 패널 오른쪽 사이드(현재 "전체 보기" 근처)에 "즐겨찾기 N건 전체 해제" 텍스트 버튼을 추가한다. 클릭 시 confirm dialog를 띄우고 확인해야만 IndexedDB의 favorites 전체를 삭제한다.

### ALLOWED_PATHS (추가)
CREATE
- `client/src/features/race-favorite/ui/FavoriteIndicator.tsx` — 다양한 사이즈/톤을 지원하는 read-only 아이콘 컴포넌트

MODIFY
- `client/src/shared/lib/favoritesDb.ts` — `clearAllFavorites()` 추가
- `client/src/features/race-favorite/model/useFavorites.ts` — `clearAll()` command + 개수 노출
- `client/src/features/race-favorite/index.ts` — FavoriteIndicator 재수출
- `client/src/features/race-list/ui/RaceTable.tsx` — desktop row와 mobile card에 indicator 삽입
- `client/src/features/race-calendar/ui/CalendarDay.tsx` — indicator 삽입
- `client/src/features/race-calendar/ui/CalendarWeek.tsx` — indicator 삽입
- `client/src/features/race-calendar/ui/CalendarMonth.tsx` — RaceRow, MobileRaceChip, MobileRaceRow, DrawerRaceMatrix 4곳
- `client/src/pages/RaceListPage.tsx` — 즐겨찾기 IconButton badge, 필터 collapse에 clear-all 버튼 + confirm Dialog

### NON_GOALS (재확인)
- 즐겨찾기 그룹핑/폴더/노트 없음
- 여러 개 선택 후 부분 해제 없음 (bulk clear는 전체 해제뿐)
- clear 후 undo 없음 (confirm dialog로 오조작 예방)

## Risks
- IndexedDB는 비동기이므로 초기 로드 전 flicker 가능 → useFavorites가 loading=true인 동안 favorites=empty로 두고 토글 disabled
- Safari private mode에서 IndexedDB block 가능성 → try/catch로 안전 fallback (in-memory Set, 페이지 세션 유지)
- cross-tab sync: BroadcastChannel 미지원 브라우저는 window focus 시 재조회로 처리
