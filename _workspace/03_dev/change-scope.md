# Change Scope — 최적 동선 만들기

## CHANGE_MODE: existing-change

## TARGET_BEHAVIOR
날짜별 경기 목록에서 "동선 만들기" 버튼 클릭 시 DP 알고리즘으로 최적 동선을 계산하고,
지하철 노선표 형태(경기장별 컬러 바, 환승 구간)로 인라인 표시한다.

## ALLOWED_PATHS
- `client/src/features/race-itinerary/` — 전체 신규 슬라이스
- `client/src/features/race-calendar/ui/CalendarDay.tsx` — 버튼+패널 삽입
- `client/src/features/race-list/ui/RaceTable.tsx` — 버튼+패널 삽입

## PUBLIC_CONTRACTS_TO_PRESERVE
- `RaceEntry` 타입 — 스키마 변경 없음
- `CategoryChip` props — 변경 없음
- `RaceDetailDrawer` props — 변경 없음
- `computeOptimalItinerary` 순수 함수 — 동일 입력 → 동일 출력 (결정적)

## NON_GOALS
- CalendarMonth, CalendarWeek 수정 없음
- RaceDetailDrawer 수정 없음
- localStorage 저장 없음
- 실제 지도 API 연동 없음

## CHANGE_BUDGET
- 신규 파일: race-itinerary 슬라이스 8개
- 수정 파일: CalendarDay.tsx, RaceTable.tsx (각 ~20줄 추가)

## TEST_EVIDENCE
- `pnpm typecheck`: 빌드 PASS
- `pnpm build`: Vite 번들 PASS
- 알고리즘 단위 테스트 (vitest 설치 시)
