# State Contract — Race Favorites

LOCAL_DOMAIN_STATE_MODE: true

## 1. Authoritative State vs Derived View

- **Authoritative store**: IndexedDB `tamiya-race-favorites` DB의 `favorites` object store. 각 record는 `{id: string, addedAt: number}`.
- **In-memory mirror**: `useFavorites` 훅이 로드 후 `Set<string>` 형태로 노출. 화면은 이 mirror에서만 읽는다.
- **Derived view**:
  - `filteredRaces` — `usePageSettings.onlyFavorites`와 `useFavorites.favorites`로부터 파이프라인 계산
  - `todayRaces`, RaceCalendar, RaceTable 등은 `filteredRaces`만 사용 → 자동 반영
- Persistence 계층: IndexedDB (favorites), localStorage `tamiya-race-settings` (onlyFavorites 포함 UI 설정)

## 2. Aggregate, ID, References, Ordering Invariants

- Aggregate root: 단일 favorites Set. Race 간 상호 참조 없음.
- ID: `RaceEntry.id`가 그대로 favorite id. 도메인 외부에서 별도 id 발급 없음.
- 참조 무결성: races.json의 race.id가 사라져도 favorites record는 유지 (unknown race 대응: 렌더 시점에 base race set에 없으면 자동으로 리스트에서 제외되지만 favorites store에는 남는다). 대량 정리는 별도 UI가 없으므로 이번 범위에서 자동 삭제하지 않는다.
- 정렬: favorites Set은 정렬 없음. 리스트 표시는 항상 `RaceEntry.date/time` 기준 (기존 로직 유지).

## 3. Commands

### `useFavorites().toggle(id: string)`
- Precondition: id는 non-empty string. loading이 완료된 상태.
- Postcondition: favorites Set에 id가 없으면 추가·있으면 제거. IndexedDB에 즉시 반영.
- Failure: IndexedDB 접근 실패 시 in-memory Set은 갱신하되 다음 페이지 로드 때 최근 상태로 복원됨. try/catch로 UI 크래시 방지.

### `useFavorites().isFavorite(id: string) → boolean`
- Precondition: 없음. loading 상태에서는 항상 false.
- Postcondition: Set 조회. 부작용 없음.

### `useFavorites().clearAll()`
- Precondition: 없음.
- Postcondition: in-memory Set을 빈 Set으로 교체, IndexedDB의 favorites store를 clear. BroadcastChannel로 다른 탭 알림.
- Failure: IndexedDB clear 실패 시 mirror만 비워지고 다음 로드 때 실제 저장소 상태로 재동기화. 사용자에겐 UI만 즉시 반영.
- **Destructive**: 반드시 UI 계층에서 confirm dialog 후에만 호출. clearAll 자체는 dialog를 띄우지 않음 (도메인 store는 UI 정책과 분리).

### `useFavorites().refresh()`
- Postcondition: IndexedDB에서 전체 record를 다시 읽어 in-memory Set 교체.
- 트리거: cross-tab BroadcastChannel `tamiya-race-favorites` 메시지, `window` focus 이벤트, mount.

### `usePageSettings.setOnlyFavorites(next: boolean)`
- Postcondition: React state + localStorage에 즉시 반영.

## 4. 구조 필드 vs 일반 편집 필드

- 구조: `race.id`, `race.date`, `race.time`. Favorites는 이들 필드에 대해 read-only.
- 즐겨찾기 자체는 boolean 상태이므로 구조 필드 없음. 편집 대상은 favorites Set 멤버십뿐.

## 5. Destructive / Cascade / Confirm / Undo / Recovery

- toggle off는 destructive이지만 소량 데이터·즉시 재추가 가능·1 tap 조작이므로 confirm 없이 즉시 반영.
- bulk clear는 destructive이며 개별 복구가 불가능하므로 UI 계층에서 반드시 confirm dialog로 사용자 확인 후 clearAll 호출한다. undo는 제공하지 않는다.
- cascade: races.json 변경 시 자동 삭제하지 않음 (사용자가 나중에 같은 id로 복원 가능).
- recovery: IndexedDB open 실패 시 in-memory Set으로 fallback, 새로고침마다 재시도. UI toggle은 계속 동작.

## 6. Storage Schema, Version, Migration, Recovery, Limits

### IndexedDB
- DB name: `tamiya-race-favorites`
- Version: `1`
- Object store: `favorites`, keyPath: `id`
- Record: `{id: string, addedAt: number}`
- Migration: 최초 open 시 store 생성. 이후 버전 업 시 `onupgradeneeded`에서 데이터 유지 후 스키마 확장.
- Invalid state recovery: open 실패 (private mode, quota 등) → in-memory only fallback. 사용자에게 별도 경고 없음 (데이터 손실 위험 낮음).
- Size cap: 소프트 상한 500개. UI에서 강제하지 않지만 change-scope의 non-goals이므로 이번 범위는 검증만.

### localStorage 확장
- `tamiya-race-settings` value에 `onlyFavorites?: boolean` 필드 추가.
- 기존 SETTINGS_VERSION `1`은 유지 (기존 필드 파괴 없음). onlyFavorites은 optional로 sanitize에서 boolean 검증 통과 시에만 수용.
- 이전 값에 onlyFavorites 필드가 없으면 `false`로 초기화.

## 7. Cross-tab / Refresh / Import-Export

- Cross-tab: BroadcastChannel `tamiya-race-favorites` 로 add/remove/clear 메시지 브로드캐스트. 다른 탭이 수신하면 refresh 호출.
- BroadcastChannel 미지원 브라우저 대응: `window` focus 이벤트에서도 refresh를 호출한다.
- refresh: mount 시 1회 + focus 이벤트 + BroadcastChannel 메시지 수신.
- import/export: 제공하지 않음.

## 8. Fixtures & Interaction Budget

- Normal: favorites 0~30개 → 필터 파이프라인 O(n)에서 무시할 수준.
- Max: 500개 → filteredRaces Set-membership 조회는 O(1). 파이프라인은 races 배열(수백 건) × 필터 predicate.
- Interaction budget: toggle 클릭에서 UI 반영까지 <100ms. IndexedDB write는 async지만 optimistic update로 즉시 UI 반영.

## 9. Verification Matrix (요구사항 ID ↔ 증거)

| Requirement | Assertion | Evidence |
|---|---|---|
| R1: 상세 헤더 깃발 클릭 저장 | toggle 후 재로드 시 filled 상태 유지 | manual, IDB inspect |
| R2: 필터 상위 토글 | onlyFavorites=true면 favorites base로 파이프라인 시작 | RaceListPage useMemo unit test 또는 manual |
| R3: 즐겨찾기 위에 필터 AND | favorites ∩ venue/category filter | manual (2조합 확인) |
| R4: 빈 상태 안내 | favorites=0 & onlyFavorites=true → 안내 메시지 | manual DOM 관찰 |
| R5: 캘린더 뷰 반영 | 캘린더 데이터 원천이 filteredRaces이므로 자동 | manual (view toggle) |
| R6: localStorage v1 → v2 하위 호환 | 기존 저장 값에 onlyFavorites 없음 → false로 시작, 다른 필드 유지 | manual (기존 값 로드) |
| R7: IndexedDB 접근 실패 fallback | in-memory Set만 동작, 크래시 없음 | manual (Safari private mode 또는 강제 error) |

## 10. Non-Negotiable Invariants (재확인)

- `RaceEntry`를 `Partial<RaceEntry>`로 수정하지 않는다 (favorites는 별 store).
- 필터 결과가 0개여도 favorites store를 자동 삭제하지 않는다.
- UI의 filtered/virtualized index로 favorites 대상 id를 판정하지 않는다. 항상 `race.id`로 판정.
- IndexedDB 값은 외부 입력으로 취급. `id`가 string인지 런타임 검증 후 mirror에 넣는다.
