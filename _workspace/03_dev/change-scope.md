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

## Extension — Crawl Merge + Stable race.id (feature)

CHANGE_MODE: existing-change
REQUEST_TYPE: feature
EXTERNAL_DATA_INGESTION_MODE: true

### REQUEST (사용자)
- races.json 갱신을 전체 덮어쓰기 대신 기존 데이터에 병합
- 지난 경기가 사라지지 않아 이전 경기 히스토리와 즐겨찾기 설정이 계속 유효
- 병합 식별은 wrId만 의존하지 말고 event 수준의 stable identifier 사용

### OBSERVED_BASELINE
- `scripts/crawl.ts`: 매 실행마다 목록 + 상세를 새로 크롤 → `data/races.json`을 완전 덮어쓰기
- `.github/workflows/crawl.yml`: 매일 KST 00:00 실행, 결과 파일이 diff 있으면 커밋
- `race.id = ${wrId}-${idx}` 형태. idx는 이번 크롤 결과의 event 순서 → 관리자가 종목 재배치하면 idx shift 발생, 즐겨찾기 유실 가능성
- `details` map: key=wrId, value=RaceDetail(참가비/접수기한/방법/문의/신청 URL). 게시글(wrId) 단위로 상세가 공유됨
- 클라이언트 4곳에서 `race.id.split('-')[0]`로 wrId 추출: `queries.ts`, `RaceDetailDrawer.tsx`, `RegistrationDrawer.tsx`, `crawl.ts`

### TARGET_BEHAVIOR
1. Crawl 실행 시 기존 `data/races.json`을 먼저 로드
2. 이번 크롤에 등장한 각 wrId에 대해:
   - 해당 wrId의 기존 entries와 detail을 새 크롤 결과로 완전 교체 (게시글 편집을 신뢰)
3. 이번 크롤에 등장하지 않은 wrId는 기존 entries와 detail을 그대로 유지 (무제한 보존)
4. `count`는 병합 후 실제 entries 수로 재계산. `cachedAt`은 이번 실행 시각으로 갱신
5. race.id는 stable하게 재설계
   - RaceEntry에 `wrId: string` 필드 명시 추가
   - `race.id = ${wrId}-${eventKeyHash}` 형태로 유지하되 eventKeyHash는 `date + venue + time + category` 기반 8자리 hash → 관리자가 종목 순서/개수를 바꿔도 event가 살아있으면 같은 id 유지 → 즐겨찾기 안정
6. 클라이언트 `race.id.split('-')` 파싱은 제거. `race.wrId` 직접 참조
7. `RaceDetail.wrId` value 필드는 map key와 중복이지만 이번 범위에서는 유지 (하위 호환)

### ALLOWED_PATHS
MODIFY
- `lib/crawler.ts` — RaceEntry에 wrId 필드 추가, event stable hash로 id 생성
- `scripts/crawl.ts` — 기존 파일 로드 후 wrId 단위 merge
- `client/src/entities/race/model/types.ts` — RaceEntry에 wrId 필드 추가
- `client/src/entities/race/api/queries.ts` — split 파싱 제거, race.wrId 직접 사용
- `client/src/features/race-list/ui/RaceDetailDrawer.tsx` — split 파싱 제거
- `client/src/features/race-list/ui/RegistrationDrawer.tsx` — split 파싱 제거

### PUBLIC_CONTRACTS_TO_PRESERVE
- `data/races.json` 최상위 스키마 (`data`, `details`, `count`, `cachedAt`) — key 이름 유지
- `RaceEntry` 기존 필드(id, title, venue, date, time, category, note, detailUrl, registrationStartDate?, registrationDeadlineRaw?) — 유지, wrId만 추가
- `RaceDetail` 스키마 유지
- 즐겨찾기 저장 스키마 (IndexedDB `favorites` store, `{id, addedAt}`) — 유지
- 크롤링 workflow trigger/schedule — 변경 없음

### NON_GOALS
- server/ legacy 코드 정리 (dead code로 확인되나 이번 범위 밖)
- `RaceDetail.wrId` value 필드 제거
- `details` map 구조 변경
- server-side 상세 실시간 조회
- 즐겨찾기 마이그레이션 (기존 id는 `${wrId}-${idx}`, 새 id는 `${wrId}-${hash}` → 다르므로 크롤 이후 즐겨찾기가 일부 miss 될 수 있음. change-journal에 명시)

### MIGRATION IMPLICATION (즐겨찾기)
- 기존 즐겨찾기 id 예: `"523-0"`
- 새 id 예: `"523-a3b7c9d1"` (date+venue+time+category hash)
- 처음 crawl 이후 기존 즐겨찾기는 UI에서 매칭 안 됨 → indicator 안 뜸. IndexedDB 값은 유지되지만 stale
- 이후부터는 관리자가 종목 순서 바꿔도 즐겨찾기 유지됨 (구조가 안정됨)
- 사용자에게는 change-journal + release note로 안내

### CHANGE_BUDGET
- 수정 6개 파일 (crawler 2 + client 4)
- 크롤러에 crypto hash 유틸 함수 추가 (Node native `crypto.createHash`)
- 새 dependency 없음

### TEST_EVIDENCE
- `pnpm crawl` dry-run: 기존 races.json 백업 후 실행 → 병합 결과에 이전 wrId가 포함되는지 확인
- 두 번째 dry-run: 같은 데이터로 다시 실행 → payload가 idempotent 한지 (같은 wrId는 완전 교체이므로 결과 동일)
- typecheck / build PASS

## Extension — Active/Archive 스냅샷 분리 (feature)

CHANGE_MODE: existing-change
REQUEST_TYPE: feature
EXTERNAL_DATA_INGESTION_MODE: true

### REQUEST
리스트 뷰가 병합 아카이브 전체를 렌더해 무한히 길어지는 문제 해결. active 스냅샷을 별도 파일로 분리해 리스트는 이걸 소비, 전체 아카이브는 캘린더·즐겨찾기 모드에서 사용

### TARGET_BEHAVIOR
1. 크롤 시 두 파일 생성
   - `data/races.json` — 전체 아카이브 (기존 병합 로직 그대로)
   - `data/races-active.json` — 이번 크롤에 실제로 사이트에서 가져온 wrId만 포함 (사이트에 살아있는 게시글)
   - active의 `data`와 `details`는 fresh crawl 결과 자체, count는 그 길이
2. 두 파일 모두 `client/public/`에 자동 복사
3. 클라이언트는 두 fetch 훅 노출
   - `fetchActiveRaces()` — races-active.json
   - `fetchAllRaces()` — races.json (전체)
4. RaceListPage 로드 전략
   - 페이지 mount 시 active와 전체를 **병렬 fetch** (사용자 결정)
   - 리스트 뷰: active 데이터만 사용
   - 캘린더 뷰: 전체 데이터 사용
   - "즐겨찾기만 보기" 토글: 전체 데이터 사용 (히스토리 조회)
5. 상세 조회는 전체 details map 사용 (active에서 miss될 수 있는 과거 즐겨찾기 대응)

### ALLOWED_PATHS
MODIFY
- `scripts/crawl.ts` — active 파일 별도 저장, client/public 복사 추가
- `client/src/entities/race/api/queries.ts` — fetchActiveRaces, fetchAllRaces 분리. 두 캐시 유지
- `client/src/pages/RaceListPage.tsx` — 두 데이터를 각각 useQuery로 가져와 리스트/캘린더/즐겨찾기 분기

### PUBLIC_CONTRACTS_TO_PRESERVE
- `data/races.json` 스키마와 병합 정책 변경 없음 (아카이브)
- `RacesResponse` 타입 변경 없음
- 상세 Drawer의 `fetchRaceDetail`, `raceDetailQueryKey` 계약 변경 없음 — 전체 aggregated details를 조회
- 즐겨찾기 IndexedDB store 변경 없음

### NON_GOALS
- 서버 API 도입
- races.json 파일 자체 분할 (월별 등)
- 지연 로딩/pagination — 두 파일 모두 initial load

### CHANGE_BUDGET
- 3개 파일 수정. 새 dependency 없음
- 새 정적 파일 하나 추가 (races-active.json)

### TEST_EVIDENCE
- typecheck / build PASS
- 사용자 crawl 재실행 → 두 파일 생성 확인, active < 전체 count 검증
- 리스트 뷰: active만 표시, 캘린더 뷰: 전체 표시, 즐겨찾기 모드: 전체 표시

## Risks
- IndexedDB는 비동기이므로 초기 로드 전 flicker 가능 → useFavorites가 loading=true인 동안 favorites=empty로 두고 토글 disabled
- Safari private mode에서 IndexedDB block 가능성 → try/catch로 안전 fallback (in-memory Set, 페이지 세션 유지)
- cross-tab sync: BroadcastChannel 미지원 브라우저는 window focus 시 재조회로 처리
