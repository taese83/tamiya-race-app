# Tech Stack — 타미야 대회 일정 뷰어 + 동선 기능 추가

## Architecture Profile
`internal-spa + node-proxy` — React SPA + Express 크롤링 프록시 (모노레포)

## 구조
```
tamiya-race-app/
  server/          Node.js Express 크롤링 서버 (port 3001)
  client/          React Vite SPA (port 5173, proxy → 3001)
  package.json     루트 workspace
```

## Compatibility Matrix
| Component | Version | Decision |
|---|---|---|
| Node | 22.11.0 | 환경 제약 |
| pnpm | 10.14.0 | 패키지 매니저 |
| React | 19.2 | 프론트엔드 |
| TypeScript | 6.0 | 전체 |
| Vite | 6.4 | 클라이언트 빌드 |
| Express | 4.x | 크롤링 서버 |
| cheerio | 1.x | HTML 파싱 |
| axios | 1.x | HTTP 클라이언트 (서버에서 타미야 크롤링) |
| MUI | 7.3 | UI 컴포넌트 |
| TanStack Query | 5.x | 서버 상태 관리 |
| date-fns | 4.x | 날짜 포맷 |

## Architecture Decisions
| Decision | Choice | Trade-off |
|---|---|---|
| 크롤링 위치 | 서버사이드 (Express) | CORS 우회, 타미야 사이트 User-Agent 제어 |
| 프록시 방식 | Vite dev proxy → Express | 개발 편의성 |
| 빌드 방식 | 클라이언트만 빌드, 서버는 ts-node/tsx | 단순성 |
| 캐싱 | 인메모리 (10분 TTL) | 타미야 서버 부하 방지, 재배포 없이 유지 |

---

## 동선 기능 추가 기술 결정

**추가 라이브러리: 없음** — 기존 스택(React 19, MUI v7, TypeScript 6)이 모든 요구사항 커버

| 항목 | 결정 | 이유 |
|---|---|---|
| DP 실행 위치 | 메인 스레드 동기 | 최대 상태 수 25,600 (50슬롯×8경기장×64 bitmask) → 실행 <1ms. Web Worker 왕복 오버헤드 10~50ms가 더 큼 |
| 환승 연결선 | `Box sx borderTop: '2px dashed'` + `gridColumn: '1 / -1'` | SVG/position:absolute 불필요, 수평 구분선으로 충분 |
| 노선 컬러 바 | `Box sx borderLeft: '4px solid {venueColor}'` | MUI v7 지원, theme 수정 없음 |
| 경기장 색상 | 독립 상수 배열 8색 (venueColors.ts) | MUI theme 격리 |
| 패널 방식 | MUI `Collapse` 인라인 | 기존 RaceDetailDrawer와 z-index 충돌 없음, 날짜 맥락 유지 |
