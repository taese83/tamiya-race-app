# Change Scope

CHANGE_MODE: existing-change
REQUEST: 네이버 캘린더 iCal 연동 — 개인 일정을 타미야 캘린더에 함께 표시

TARGET_BEHAVIOR:
  - 앱바 📅 아이콘 버튼 클릭 → 우측 드로어에서 iCal URL 추가/관리 (최대 5개)
  - 각 소스마다 이름·색상 지정, localStorage에 저장
  - 페이지 로드 시 Vercel Edge Function(/api/ical-proxy)을 통해 iCal 자동 fetch
  - 월 뷰 셀: 타미야 아래 구분선 + 네이버 색상 도트
  - 일/주 뷰 드로어: 타미야 아래 구분선 + 네이버 이벤트 항목
  - 리스트 뷰: 날짜 섹션 안 구분선 아래 네이버 이벤트 행
  - 반복 이벤트는 첫 회차만 표시

ALLOWED_PATHS:
  신규:
    - src/entities/calendar-event/model/types.ts
    - src/entities/calendar-event/index.ts
    - src/features/naver-calendar/model/icalParser.ts
    - src/features/naver-calendar/model/useNaverCalendar.ts
    - src/features/naver-calendar/ui/NaverCalendarDrawer.tsx
    - src/features/naver-calendar/ui/CalendarEventChip.tsx
    - src/features/naver-calendar/index.ts
    - api/ical-proxy.ts
  수정:
    - src/features/race-calendar/ui/RaceCalendar.tsx
    - src/features/race-calendar/ui/CalendarDay.tsx
    - src/features/race-calendar/ui/CalendarWeek.tsx
    - src/features/race-calendar/ui/CalendarMonth.tsx
    - src/features/race-list/ui/RaceTable.tsx
    - src/pages/RaceListPage.tsx
    - vercel.json

PUBLIC_CONTRACTS_TO_PRESERVE:
  - RaceCalendar props (races, view, onViewChange, onRaceClick, onRegStartClick, todayKey) — 추가만
  - CalendarDay/Week/Month props — calendarEvents 추가만
  - RaceTable props (races) — calendarEvents 추가
  - RaceEntry, RaceDetail 타입 무변경
  - localStorage 기존 키(tamiya-race-settings) 무변경

NON_GOALS:
  - 네이버 OAuth 로그인
  - 이벤트 편집/삭제
  - 구글·애플 캘린더 지원
  - 반복 이벤트 전개 (첫 회차만)
  - 서버 저장 / URL 공유에 캘린더 설정 포함

CHANGE_BUDGET: 신규 8파일, 수정 6파일

TEST_EVIDENCE:
  - iCal 파싱: 종일 이벤트, 시간 지정 이벤트, DTEND exclusive 보정, RRULE 스킵
  - localStorage 저장/복원: 소스 추가·삭제·재로드
  - Edge Function: calendar.naver.com 외 도메인 거부 (SSRF 방지)
