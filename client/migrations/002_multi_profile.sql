-- Stage A: 다중 프로필 + 클래스별 점수
-- 실행: psql "$DATABASE_URL_UNPOOLED" -f migrations/002_multi_profile.sql
-- 재실행 안전: IF NOT EXISTS + DO 블록으로 idempotent

-- ─── 1. profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
-- 사용자별 기본 프로필 유일성
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_default ON profiles(user_id) WHERE is_default = TRUE;

-- 기존 사용자마다 기본 프로필 자동 생성 (없는 경우만)
INSERT INTO profiles (user_id, name, is_default)
SELECT u.id, COALESCE(u.name, '나'), TRUE
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id)
ON CONFLICT DO NOTHING;

-- ─── 2. participations 스키마 확장 ─────────────────────────────
-- profile_id 컬럼 추가 (nullable로 먼저 만들고 백필)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE participations ADD COLUMN profile_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- category 컬럼 추가 (저장 시점 클래스 — 서버 판정 결과)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'category'
  ) THEN
    ALTER TABLE participations ADD COLUMN category TEXT;
  END IF;
END $$;

-- 기존 데이터를 각 user의 default 프로필로 매핑
UPDATE participations p
SET profile_id = (SELECT id FROM profiles WHERE user_id = p.user_id AND is_default LIMIT 1)
WHERE profile_id IS NULL;

-- 이제 profile_id NOT NULL 강제 + PK 재설정
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'profile_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE participations ALTER COLUMN profile_id SET NOT NULL;
  END IF;
END $$;

-- PK를 (user_id, race_id) → (profile_id, race_id)로 교체 (있으면 drop 후 add)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participations_pkey'
  ) THEN
    ALTER TABLE participations DROP CONSTRAINT participations_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participations_new_pkey'
  ) THEN
    ALTER TABLE participations ADD CONSTRAINT participations_new_pkey PRIMARY KEY (profile_id, race_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_participations_profile ON participations(profile_id);

-- 기존 user_id 컬럼은 이제 사용하지 않으므로 nullable로 변경 (아직 삭제는 하지 않음, 롤백 여지 유지)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participations ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- ─── 3. manual_scores_by_class 신설 ────────────────────────────
CREATE TABLE IF NOT EXISTS manual_scores_by_class (
  profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class      TEXT NOT NULL,
  points     INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, class)
);

-- 기존 manual_scores는 archive 테이블로 이름 변경 (남겨둠, 재입력 필요 안내)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_scores')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_scores_archive') THEN
    ALTER TABLE manual_scores RENAME TO manual_scores_archive;
  END IF;
END $$;
