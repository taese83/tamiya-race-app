# 다중 프로필 참여 시나리오 보고서

## 배경
가족 참여(아이와 함께 대회 참가) 지원. 로그인 계정 하나 아래 여러 프로필을 두고, 참여·순위·점수를 프로필별로 관리한다.

## 핵심 결정 사항 (사용자 확정)
1. **프로필 다중 (Option A)** — 로그인 계정 아래 여러 프로필
2. **로그인 시 기본 프로필 "나" 자동 생성** — 추가·수정·삭제는 사용자가 UI로
3. **한 경기에 여러 프로필 참여 가능** — participations 유니크 키에 profile_id 포함
4. **점수 UI: 프로필별 탭 → 그 안에 클래스별 breakdown**

## 데이터 모델

### profiles 테이블 (신규)
```sql
CREATE TABLE profiles (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON profiles(user_id);
-- 사용자별 기본 프로필 유일성 (부분 인덱스)
CREATE UNIQUE INDEX ON profiles(user_id) WHERE is_default = TRUE;
```

### participations 스키마 변경
```sql
-- 기존 PK (user_id, race_id) → (profile_id, race_id)로 변경
ALTER TABLE participations DROP CONSTRAINT participations_pkey;
ALTER TABLE participations ADD COLUMN profile_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE participations ADD COLUMN category TEXT;  -- 저장 시점 클래스 (서버 판정 편의)
ALTER TABLE participations ADD PRIMARY KEY (profile_id, race_id);
CREATE INDEX ON participations(profile_id);
-- 기존 데이터는 각 user의 기본 profile로 마이그레이션
```

### manual_scores 재설계 (클래스별)
```sql
CREATE TABLE manual_scores_by_class (
  profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class      TEXT NOT NULL,  -- 'M.SPEED'|'M1'|'M2B'|'M2'|'M3'|'OPEN'
  points     INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, class)
);
-- 기존 manual_scores는 사용자별 기본 프로필의 특정 클래스로 마이그레이션할 방법 없음 (클래스 정보 없음)
-- → 기존 값은 default 프로필의 'OPEN' 클래스로 이전하거나 삭제 결정 필요
```

## API 재설계

### profiles
- `GET  /api/profiles` — 로그인 사용자의 프로필 목록
- `POST /api/profiles` — 새 프로필 (body: {name})
- `PUT  /api/profiles/:id` — 이름 수정 또는 기본 지정 (body: {name?, isDefault?})
- `DELETE /api/profiles/:id` — 삭제. 기본 프로필은 삭제 불가. 삭제 시 소속 participations CASCADE

### participations (변경)
- `GET  /api/participations?profileId=N` — 특정 프로필의 참여 목록. 없으면 전체 프로필 목록
- `PUT  /api/participations` — body: {profileId, raceId, wrId, rank?, category}
- `DELETE /api/participations?profileId=N&raceId=X` — 파라미터 사용

### scores (변경)
- `GET /api/scores` — 응답 스키마:
  ```json
  {
    "profiles": [
      {
        "id": 1,
        "name": "나",
        "byClass": {
          "M.SPEED": {"station": 5, "manual": 10, "total": 15},
          "M1": {"station": 3, "manual": 0, "total": 3},
          ...
        },
        "profileTotal": 30,
        "counts": {"M.SPEED": {"participate": 2, "rank1": 1, ...}, ...}
      },
      ...
    ],
    "grandTotal": 55
  }
  ```
- `PUT /api/scores/manual` — body: {profileId, class, points}

## UI 재설계

### ParticipationBox (RaceDetailDrawer 내)
- 프로필이 1개면: 기존과 동일 (참여 + 결과)
- 프로필이 여러 개면: 프로필별 행 반복
  ```
  🏆 내 참여 기록
      나     ☑ 참여   결과 [1등 ▾]
      아이   ☐ 참여   결과 [-]
      [+ 다른 프로필로 참여]  (프로필 미참여 상태에서만)
  ```
- 프로필 선택 후 각각 독립 mutate

### ScoreLayer (Dialog)
- 상단 프로필 탭 (Tabs): "나 | 아이" — 활성 탭에서만 아래 정보 표시
- 각 탭 안:
  - 프로필 총점 (grand: 프로필별 total)
  - 클래스별 카드 6개 (M.SPEED/M1/M2B/M2/M3/OPEN)
    - 각 카드: 참여 N회, 1등 N, 2등 N, 3등 N, 수동 N점, 클래스 총점
  - 수동 점수 (접힘) — 펼치면 클래스별 6개 필드
- 전체 grand total은 상단에 별도 (모든 프로필 합)

### 프로필 관리
- ScoreLayer 상단 또는 별도 Dialog에 "프로필 관리" 진입점
- 프로필 관리 Dialog:
  - 목록 (이름 + 기본 마크)
  - "이름 변경" · "기본으로 지정" · "삭제" 액션 (각 프로필)
  - "새 프로필 추가" 버튼

## 마이그레이션 전략 (데이터 손실 최소화)

### 002_multi_profile.sql
1. `profiles` 테이블 생성
2. 기존 사용자마다 기본 프로필 생성:
   ```sql
   INSERT INTO profiles (user_id, name, is_default)
   SELECT id, name, TRUE FROM users;
   ```
3. `participations` 마이그레이션:
   - `profile_id` 컬럼 추가
   - `UPDATE participations SET profile_id = (SELECT id FROM profiles WHERE user_id = participations.user_id AND is_default)`
   - `category` 컬럼 추가 (기본 NULL — 서버가 races.json fetch 시 채움)
   - PK 재설정 (`user_id, race_id` → `profile_id, race_id`)
   - `user_id` 컬럼은 유지 (일단 nullable하게 둠, 이후 제거 결정)
4. `manual_scores_by_class` 생성. 기존 `manual_scores`는:
   - **결정 필요**: 기존 값을 어느 클래스로 넣을지 사용자가 UI에서 재할당? 아니면 default profile의 'OPEN'으로 자동?
   - **추천**: 마이그레이션 시 자동 이관하지 않고, 사용자가 새 UI에서 다시 입력하도록 안내. 기존 manual_scores는 archive 테이블로 보관

## 구현 단계 (제안)

**Stage A (DB + 서버)**
1. Migration 002 작성
2. api/_lib/db 확장 (profiles CRUD)
3. participations/scores API 재설계
4. curl로 검증

**Stage B (클라이언트)**
1. useProfiles hook + 프로필 관리 Dialog
2. ParticipationBox 프로필별 행
3. ScoreLayer 프로필 탭 + 클래스별 UI
4. 로그인 시 default 프로필 자동 생성 로직

**Stage C (마이그레이션 UX)**
- 이전 참여 데이터는 default 프로필로 자동 이관
- 이전 수동 점수는 안내 후 재입력 요청

## Risks
- 스키마 변경이 breaking → 프로덕션 배포 시 downtime 필요 (Vercel 특성상 짧지만 마이그레이션은 별도 실행)
- 기존 수동 점수 (클래스 정보 없음) 이관 불가
- UI 복잡도 상승 — 프로필 하나만 쓰는 사용자에게도 부담. 프로필 1개일 때는 단순화 유지 필요
