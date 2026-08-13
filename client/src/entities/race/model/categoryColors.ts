// 타미야 클래스별 공식 상패 색상
// M3=주황, M2B=노랑, M2=초록, M1=파랑, OPEN=빨강, M-SPEED=보라
// M2B를 M2보다 앞에 두어 includes() 매칭 순서를 보장한다
export const CLASS_LIST = [
  {key: 'M.SPEED', label: 'M.SPEED 클래스', color: '#7b1fa2'},
  {key: 'M1',      label: 'M1 클래스',      color: '#1565c0'},
  {key: 'M2B',     label: 'M2B 클래스',     color: '#f9a825'},
  {key: 'M2',      label: 'M2 클래스',      color: '#2e7d32'},
  {key: 'M3',      label: 'M3 클래스',      color: '#e65100'},
  {key: 'OPEN',    label: 'OPEN',           color: '#c62828'},
] as const

export type ClassKey = (typeof CLASS_LIST)[number]['key']

/**
 * category 문자열("M2 클래스", "M2B 클래스", "OPEN 클래스" 등)에서 **정확한 클래스 토큰**을
 * 추출한다. substring 매칭("M2".includes)은 M2가 M2B의 접두사라 M2B를 M2로 오인식하므로,
 * 토큰을 뽑아 동치 비교한다. 정규식은 M2B의 [AB]를 탐욕적으로 먹어 M2B를 온전히 잡는다.
 */
export function classKeyOf(category: string): ClassKey | null {
  const token = category.match(/M\.SPEED|M[0-9][AB]?|OPEN/)?.[0]
  return CLASS_LIST.find(c => c.key === token)?.key ?? null
}

export function getCategoryColor(category: string): string {
  const key = classKeyOf(category)
  return CLASS_LIST.find(c => c.key === key)?.color ?? '#546e7a'
}
