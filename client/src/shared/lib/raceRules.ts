/** 클래스별 공식 규정 페이지 URL */
export const CLASS_RULES_URL: Record<string, string> = {
  'M1':      'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=349&page=2&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
  'M2':      'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=348&page=2&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
  'M2B':     'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=347&page=2&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
  'M3':      'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=346&page=2&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
  'M.SPEED': 'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=345&page=3&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
  'OPEN':    'https://tamiya.co.kr/bbs/board.php?bo_table=notice&wr_id=350&page=2&ser_cate[]=%EB%AF%B8%EB%8B%88%EC%B9%B4&list_type=list&op_desc=',
}

import {classKeyOf} from '@/entities/race/model/categoryColors'

/** category 문자열에서 규정 URL 반환 — 정확한 클래스 토큰으로 조회(M2B≠M2). */
export function getRulesUrl(category: string): string | null {
  const key = classKeyOf(category)
  return key ? (CLASS_RULES_URL[key] ?? null) : null
}
