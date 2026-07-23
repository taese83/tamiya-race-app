-- Stage 2 initial schema
-- 실행: psql "$DATABASE_URL" -f migrations/001_init.sql
-- 재실행 안전 (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,      -- Google `sub`
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  picture     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participations (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  race_id     TEXT NOT NULL,         -- race.id (wrId-hash8)
  wr_id       TEXT NOT NULL,         -- 편의상 함께 저장
  rank        SMALLINT,              -- 1|2|3|null (미기록 = 참가만)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, race_id),
  CHECK (rank IS NULL OR rank BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_participations_user ON participations(user_id);

CREATE TABLE IF NOT EXISTS manual_scores (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
