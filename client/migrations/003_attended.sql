-- Stage: participations에 attended 컬럼 추가 (선정 vs 실참여 분리)
-- 실행: psql "$DATABASE_URL_UNPOOLED" -f migrations/003_attended.sql
-- 재실행 안전 (IF NOT EXISTS + DO 블록)

-- attended: 실제 참여 여부. false면 '선정' 상태 (점수 계산 X)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participations' AND column_name = 'attended'
  ) THEN
    ALTER TABLE participations ADD COLUMN attended BOOLEAN NOT NULL DEFAULT TRUE;
    -- 기존 데이터는 모두 실참여로 간주 (이전에는 attended 개념이 없었음)
    -- DEFAULT TRUE로 이미 채워짐
  END IF;
END $$;

-- 새로 추가되는 행의 기본은 false (선정만 = 실참여 아님) — 애플리케이션 코드로 제어하므로 컬럼 default는 그대로 TRUE 유지해도 무방
-- 다만 확실히 하기 위해 default를 FALSE로 변경. 기존 데이터에는 영향 없음
ALTER TABLE participations ALTER COLUMN attended SET DEFAULT FALSE;
