# DB 초기화

Stage 2: users / participations / manual_scores 테이블 생성.

## 사전 조건

`.env.local` (client 폴더)에 `DATABASE_URL_UNPOOLED`가 세팅되어 있어야 함.
Pooled URL은 DDL 실행 중 세션이 끊길 수 있어 non-pooling을 사용.

## 실행

```bash
cd /Users/kakao/Project/web-harness/tamiya-race-app/client

# 환경변수 로드 + psql 실행 (macOS 기본 psql 없으면 brew install libpq && brew link --force libpq)
set -a; source .env.local; set +a
psql "$DATABASE_URL_UNPOOLED" -f migrations/001_init.sql
```

## 확인

```bash
psql "$DATABASE_URL_UNPOOLED" -c '\dt'
# users / participations / manual_scores 3개가 보여야 함
```

## 재실행

Migration은 idempotent (CREATE TABLE IF NOT EXISTS). 여러 번 실행해도 안전.

## Rollback

```sql
DROP TABLE IF EXISTS participations, manual_scores, users CASCADE;
```
