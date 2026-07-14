# Test QA

## Result
WARN

## Commands
| Check | Command | Exit Code | Status |
|---|---|---:|---|
| test | `pnpm test` | 0 | PASS |
| coverage | `pnpm test:coverage` | 0 | WARN |

## Summary
- passed: 0
- failed: 0
- skipped: 0
- coverage: N/A (테스트 미작성 — 초기 버전)

## 비고
크롤링 파서 로직(parseEvents, extractWrId)은 단위 테스트 추가 권장
