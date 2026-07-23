-- Stage: manual_scores_by_class를 카운트 기반으로 변경
-- 기존 points 단일 필드 → participate/rank1/rank2/rank3 4개 카운트
-- 서버가 카운트로부터 점수 계산: participate*1 + rank1*5 + rank2*3 + rank3*1
-- 사용자 지시: 기존 points 값은 모두 0으로 초기화 (재입력)

-- 4개 카운트 컬럼 추가 (기존 points는 유지하되 이후 사용 안 함)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'manual_scores_by_class' AND column_name = 'participate'
  ) THEN
    ALTER TABLE manual_scores_by_class ADD COLUMN participate INTEGER NOT NULL DEFAULT 0 CHECK (participate >= 0);
    ALTER TABLE manual_scores_by_class ADD COLUMN rank1 INTEGER NOT NULL DEFAULT 0 CHECK (rank1 >= 0);
    ALTER TABLE manual_scores_by_class ADD COLUMN rank2 INTEGER NOT NULL DEFAULT 0 CHECK (rank2 >= 0);
    ALTER TABLE manual_scores_by_class ADD COLUMN rank3 INTEGER NOT NULL DEFAULT 0 CHECK (rank3 >= 0);
  END IF;
END $$;

-- 기존 points는 0으로 재설정 (재입력 지침)
UPDATE manual_scores_by_class SET points = 0 WHERE points > 0;
