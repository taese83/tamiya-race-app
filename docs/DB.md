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

## 002 다중 프로필 + 클래스별 점수

```bash
cd /Users/kakao/Project/web-harness/tamiya-race-app/client
set -a; source .env.local; set +a
psql "$DATABASE_URL_UNPOOLED" -f migrations/002_multi_profile.sql
```

### 002 확인
```bash
psql "$DATABASE_URL_UNPOOLED" -c '\dt'
# profiles / participations / manual_scores_by_class / manual_scores_archive 확인
psql "$DATABASE_URL_UNPOOLED" -c 'SELECT * FROM profiles;'
# 기존 유저마다 기본 프로필 자동 생성됐는지
```

### 002 영향
- profiles 테이블 신설, 기존 유저마다 `is_default=TRUE` 프로필 자동 생성 (이름은 유저 name)
- participations 테이블에 `profile_id`, `category` 컬럼 추가. PK가 (user_id, race_id)에서 (profile_id, race_id)로 변경. 기존 데이터는 default 프로필로 자동 매핑
- 기존 manual_scores 테이블은 `manual_scores_archive`로 이름 변경 (데이터 보존). 새 사용자 UI에서 클래스별로 재입력 필요
- 새 `manual_scores_by_class` 테이블 생성

## 003 participations.attended (선정 vs 실참여 분리)

```bash
psql "$DATABASE_URL_UNPOOLED" -f migrations/003_attended.sql
```

### 003 영향
- participations에 `attended` boolean 컬럼 추가
- 기존 행은 모두 `attended=true`로 자동 채워짐 (기존 참여 기록 = 실참여로 간주)
- 신규 행의 default는 `false` (프로필 추가 시 '선정' 상태로 시작, 사용자가 체크박스로 실참여 확정)
- 점수 계산: `attended=true` 인 행만 반영

## 004 manual_scores_by_class 카운트 기반

```bash
psql "$DATABASE_URL_UNPOOLED" -f migrations/004_manual_counts.sql
```

### 004 영향
- manual_scores_by_class에 `participate`, `rank1`, `rank2`, `rank3` 컬럼 추가 (모두 INTEGER >= 0)
- 서버가 카운트로부터 점수 계산: `participate*1 + rank1*5 + rank2*3 + rank3*1`
- 기존 `points` 컬럼 값은 모두 0으로 초기화 (재입력 필요). 컬럼 자체는 이후 사용 안 하나 삭제하지 않음
- 클래스 카드의 chip에는 실참여 + 수동 카운트를 합산해 표시

