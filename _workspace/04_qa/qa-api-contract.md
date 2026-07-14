# API Contract QA

## Result
PASS

## Coverage
| Method | Path | Spec | Client | Status |
|---|---|---|---|---|
| GET | /api/races | RacesResponse | useQuery | PASS |
| POST | /api/races/refresh | RacesResponse | refreshRaces() | PASS |

## Findings
없음

## 검증
- RaceEntry 타입: id, title, venue, date, time, category, detailUrl 모두 일치
- 슬래시 분리: 서버에서 처리 후 단일 종목 per entry
