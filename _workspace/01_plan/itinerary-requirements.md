# Requirements — 최적 동선 만들기 (노선표 UI)

## Modes
- LOCAL_DOMAIN_STATE_MODE: false
- TIMESERIES_MODE: false
- AI_MODE: false
- EXTERNAL_DATA_INGESTION_MODE: false

## 서비스 개요
- 핵심 가치: 특정 날짜에 이동을 최소화하면서 가장 많고 다양한 경기에 참여할 수 있는 최적 순서를 자동 제안, 지하철 노선표 형태로 시각화
- 주요 사용자: 하루에 여러 경기장·클래스를 소화하려는 타미야 레이싱 참가자
- 핵심 시나리오
  1. 날짜 선택 → "동선 만들기" 클릭 → 노선표에서 경기 순서·이동 확인
  2. 경기장 간 이동은 "환승" 구간으로 직관적 표현
  3. 각 경기(정류장) 클릭 → RaceDetailDrawer에서 접수 정보 확인

## 핵심 디자인 컨셉 — 노선표

```
[경기장 A 노선 ─────]          [경기장 B 노선 ─────]
  ◉ 11:00 M3                      ◉ 13:00 M2B
  |                                |
  ◉ 14:00 M1       ↔ 환승 ↔       ◉ 15:00 M2
  |               이동              |
  ◉ 17:00 OPEN                    ◉ ...
```

- 경기장별로 세로 컬러 라인(노선)
- 같은 경기장 경기는 같은 노선에 세로로 연결
- 경기장 이동 구간: 두 노선을 잇는 수평 환승 표시 (점선 + "→ 경기장명으로 이동")
- 각 정류장: 시간 + CategoryChip + 경기장명

## 기능 요구사항

### Must Have (MVP)

- [ ] **REQ-F-010** "동선 만들기" 버튼
  - time 있는 경기 2건+ 인 날짜에만 표시 (CalendarDay, RaceTable 날짜 섹션)
  - Given: 경기 2건+ / When: 날짜 섹션 / Then: 버튼 visible + aria-label
  - Given: 경기 0~1건 / When: 날짜 섹션 / Then: 버튼 숨김

- [ ] **REQ-F-011** 최적 동선 알고리즘
  - 입력: 해당 날짜 RaceEntry[] (time='' 항목 제외)
  - 시간 슬롯 그룹핑: 동일 time = 한 슬롯(충돌), 다른 time = 중복 없음
  - 최적화 목표 (우선순위):
    1. 참여 경기 수 최대화 (가중치 100)
    2. 이동 횟수 최소화 — 같은 venue 연속=0, 다른 venue=1 (가중치 10)
    3. 클래스 다양성 — 고유 category 수 (가중치 5)
  - 알고리즘: DP (슬롯 인덱스 × venue × 방문 클래스 bitmask, 최대 64 states)
  - 출력: RaceEntry[] 시간 오름차순, 총 이동 횟수, 고유 클래스 집합
  - Given: max fixture 50건 / Then: 100ms 이내 완료

- [ ] **REQ-F-012** RouteMapPanel — 노선표 UI
  - 경기장별 세로 노선 (최대 8개 경기장, 고유 색상 자동 배정)
  - 동선 흐름: 시간 오름차순으로 위→아래
  - 정류장(각 경기): `◉ HH:MM [CategoryChip] [경기장명]`
  - 환승 구간: 다른 venue로 이동 시 두 노선 사이에 수평 점선 + "→ 경기장명" 레이블
  - 요약 헤더: "총 N경기 · 이동 M회 · 클래스 K종"
  - 정류장 클릭/Enter/Space → RaceDetailDrawer 오픈
  - 닫기 버튼 → 패널 닫힘, 원래 목록 복원
  - 모바일: 단일 컬럼 세로 스크롤 (노선은 좌측 컬러 바로 표현)
  - 데스크탑: 경기장 수만큼 컬럼 분기 가능

- [ ] **REQ-F-013** 엣지 케이스
  - 모든 경기 동일 슬롯: "같은 시간대 경기만 있어 1경기만 선택 가능합니다"
  - 모든 경기 동일 venue: 이동 0, 단일 노선
  - time='' 항목 존재: "시간 미정 N건 제외됨" 안내
  - time='' 만 있을 때: "시간 정보 없는 경기만 있습니다" 메시지

### Should Have
- [ ] 노선 색상 — 경기장별 고유 색상 팔레트 (MUI secondary palette 계열)
- [ ] 필터 또는 뷰 전환 시 열린 RouteMapPanel 자동 닫힘

### Won't Have
- 실제 지도 API / 이동 시간 고려 / 알림·저장 기능

## 알고리즘 가정 (ASSUMPTION)
| 항목 | 값 |
|---|---|
| 경기 지속 시간 | 무시 (종료 시간 필드 없음) |
| 이동 소요 시간 | 무시 — 장소 변경 횟수로 근사 |
| normal/max fixture | 20건 / 50건 |
| 클래스 수 상한 | 6개 bitmask 64 |

## 비기능 요구사항
- REQ-NFR-010 성능: 50건 기준 100ms 이내 동기 계산
- REQ-NFR-011 반응형: 360px~1440px — 모바일은 단일 컬럼, 데스크탑은 다중 컬럼
- REQ-NFR-012 접근성: WCAG 2.2 AA, 정류장 role="button"+tabIndex+onKeyDown+isComposing
- REQ-NFR-013 상태 격리: 메모리만, localStorage 쓰기 없음

## 화면 목록
1. CalendarDay — 날짜 헤더에 버튼 추가, 목록 위 RouteMapPanel 삽입
2. RaceTable (리스트 뷰) — 날짜 섹션 헤더에 버튼, 섹션 내 RouteMapPanel 삽입
3. RouteMapPanel (신규) — 노선표 인라인 패널

## 기존 컴포넌트 재사용
| 컴포넌트 | 방식 |
|---|---|
| CategoryChip | 정류장 내 클래스 표시 |
| RaceDetailDrawer | 정류장 클릭 상세 |
| CLASS_LIST | bitmask 인덱스 매핑 |
| RaceEntry 타입 | 알고리즘 I/O (스키마 변경 없음) |
