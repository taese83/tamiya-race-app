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

export function getCategoryColor(category: string): string {
  const entry = CLASS_LIST.find(c => category.includes(c.key))
  return entry?.color ?? '#546e7a'
}
