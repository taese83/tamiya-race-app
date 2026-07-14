# 타미야 대회 일정 뷰어 — 핸드오프 가이드

## 지금 바로 실행하기

```bash
cd tamiya-race-app

# 서버 + 클라이언트 동시 실행
pnpm dev

# 브라우저 접속
open http://localhost:5173
```

> 서버(3001)가 먼저 뜬 후 클라이언트(5173)가 실행됩니다. 처음 접속 시 타미야 서버에서 크롤링하므로 1~3초 소요됩니다.

## 구현된 기능

| 기능 | 상태 |
|---|---|
| 타미야 대회 일정 크롤링 (`/bbs/board.php?bo_table=club_race`) | ✅ |
| 슬래시(/) 구분 종목 → 개별 행 분리 | ✅ |
| 날짜별 그룹핑 | ✅ |
| 종목별 컬러 칩 (M1/M2/M3/M2B/OPEN) | ✅ |
| 종목 필터 토글 | ✅ |
| 과거 대회 dim 처리 | ✅ |
| 새로고침 버튼 (캐시 무효화 재크롤링) | ✅ |
| 반응형: 데스크탑 테이블 / 모바일 카드 | ✅ |
| 10분 서버 캐시 | ✅ |

## 프로젝트 구조

```
tamiya-race-app/
  server/src/
    crawler.ts    크롤링 핵심 로직 + 슬래시 파싱
    index.ts      Express API 서버
  client/src/
    entities/race/      RaceEntry 타입, API 함수
    features/race-list/ RaceTable, CategoryChip 컴포넌트
    pages/              RaceListPage (메인 화면)
    main.tsx            앱 진입점
```

## API

| Method | Path | 설명 |
|---|---|---|
| GET | /api/races | 전체 대회 목록 (10분 캐시) |
| POST | /api/races/refresh | 캐시 무효화 + 즉시 재크롤링 |

## 주요 파일 위치

| 역할 | 파일 |
|---|---|
| 크롤링·파싱 로직 | `server/src/crawler.ts` |
| 종목 색상 | `client/src/features/race-list/ui/CategoryChip.tsx` |
| 테이블/카드 렌더링 | `client/src/features/race-list/ui/RaceTable.tsx` |

## 다음 단계

- 종목 색상 추가: `CategoryChip.tsx`의 `CATEGORY_COLORS` 수정
- 크롤링 대상 URL 변경: `server/src/crawler.ts`의 `TAMIYA_URL` 수정
- 캐시 TTL 변경: `server/src/crawler.ts`의 `CACHE_TTL_MS` 수정
- 파서 단위 테스트: `parseEvents()` 함수 테스트 추가 권장
