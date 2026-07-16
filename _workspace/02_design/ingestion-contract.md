# Ingestion Contract — tamiya-race-app

## Mode
EXTERNAL_DATA_INGESTION_MODE: true
Mode: static-snapshot

## Source
- https://tamiya.co.kr/bbs/board.php?bo_table=club_race&ser=0 (공개 웹)
- 인증 없음. robots.txt/이용약관 확인 필요 (BLOCKER-AUTH-001, BLOCKER-AUTH-002)

## Flow
크롤링(`pnpm crawl`) → `data/races.json` → `scripts/prepare-build.cjs` → `client/public/races.json` → Vite build → 정적 서빙

## Generated Artifacts
| Path | Required | minCount |
|---|---|---|
| `data/races.json` | true | 1 |
| `client/public/races.json` | true | 1 |

## Quality SLOs
- freshness: PT24H
- minCount: ≥ 1
- required fields: id, title, date, category
- duplicate id: 0

## Promotion Policy
reject-invalid — validate 통과 후 promote

## Serving Fallback
last-known-good (미구현 — BLOCKER-LKG-008)

## Key Blockers
- BLOCKER-AUTH-001: robots.txt 확인 미완료
- BLOCKER-AUTH-002: 이용약관 확인 미완료
- BLOCKER-VALIDATE-006: promote 전 schema 검증 미구현
- BLOCKER-PROMOTE-007: races.json 부재 시 빈 파일 생성 후 exit 0 (exit 1 필요)
- BLOCKER-LKG-008: last-known-good 파일 미구현
