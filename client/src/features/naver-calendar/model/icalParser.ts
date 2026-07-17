import type {CalendarEvent, CalendarSource} from '@/entities/calendar-event'

// iCal RFC 5545 파서 — 반복 이벤트(RRULE)는 첫 회차만 처리

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

/** "20260717T090000" or "20260717T090000Z" → {date: "2026.07.17", time: "09:00"} */
function parseDtDateTime(value: string): {date: string; time: string} {
  const isUtc = value.endsWith('Z')
  const clean = value.replace('Z', '').replace('T', '')
  const year = clean.slice(0, 4)
  const month = clean.slice(4, 6)
  const day = clean.slice(6, 8)
  const hour = clean.slice(8, 10) || '00'
  const min = clean.slice(10, 12) || '00'

  if (isUtc) {
    // UTC → KST (+9)
    const d = new Date(`${year}-${month}-${day}T${hour}:${min}:00Z`)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    const y = kst.getUTCFullYear()
    const mo = padTwo(kst.getUTCMonth() + 1)
    const da = padTwo(kst.getUTCDate())
    const h = padTwo(kst.getUTCHours())
    const mi = padTwo(kst.getUTCMinutes())
    return {date: `${y}.${mo}.${da}`, time: `${h}:${mi}`}
  }
  return {date: `${year}.${month}.${day}`, time: `${hour}:${min}`}
}

/** "20260718" → "2026.07.18" */
function parseDtDate(value: string): string {
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`
}

/** "2026.07.19" → 하루 빼기 → "2026.07.18" (DTEND exclusive 보정) */
function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr.replace(/\./g, '-'))
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}.${padTwo(d.getMonth() + 1)}.${padTwo(d.getDate())}`
}

/** iCal 줄 이어붙이기 (folding 해제) */
function unfold(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

/** VEVENT 블록 하나를 파싱 */
function parseVEvent(
  block: string,
  source: CalendarSource,
): CalendarEvent | null {
  const lines = block.split(/\r?\n/)
  const props: Record<string, string> = {}
  const paramProps: Record<string, {params: string; value: string}> = {}

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const rawKey = line.slice(0, colonIdx)
    const val = line.slice(colonIdx + 1).trim()
    const semiIdx = rawKey.indexOf(';')
    if (semiIdx !== -1) {
      const key = rawKey.slice(0, semiIdx).toUpperCase()
      const params = rawKey.slice(semiIdx + 1).toUpperCase()
      paramProps[key] = {params, value: val}
    } else {
      props[rawKey.toUpperCase()] = val
    }
  }

  const uid = props['UID'] ?? `${Date.now()}-${Math.random()}`
  // iCal 이스케이프 해제: \n → 줄바꿈, \, → 쉼표, \; → 세미콜론
  const unescape = (s: string) => s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
  const summary = unescape(props['SUMMARY'] ?? '(제목 없음)')
  const location = props['LOCATION'] ? unescape(props['LOCATION']) : undefined
  const description = props['DESCRIPTION'] ? unescape(props['DESCRIPTION']) : undefined

  // DTSTART 파싱
  let startDate = ''
  let startTime: string | undefined
  let allDay = false

  const dtStartRaw = paramProps['DTSTART'] ?? {params: '', value: props['DTSTART'] ?? ''}
  if (dtStartRaw.params.includes('VALUE=DATE') || (!dtStartRaw.params.includes('T') && !dtStartRaw.value.includes('T'))) {
    allDay = true
    startDate = parseDtDate(dtStartRaw.value.replace(/\D/g, '').slice(0, 8))
  } else {
    const parsed = parseDtDateTime(dtStartRaw.value)
    startDate = parsed.date
    startTime = parsed.time
  }

  if (!startDate) return null

  // DTEND 파싱
  let endDate: string | undefined
  let endTime: string | undefined

  const dtEndRaw = paramProps['DTEND'] ?? {params: '', value: props['DTEND'] ?? ''}
  if (dtEndRaw.value) {
    if (allDay || dtEndRaw.params.includes('VALUE=DATE') || !dtEndRaw.value.includes('T')) {
      // 종일 이벤트 DTEND는 exclusive → -1일
      const raw = parseDtDate(dtEndRaw.value.replace(/\D/g, '').slice(0, 8))
      const adjusted = subtractOneDay(raw)
      // 같은 날이면 endDate 생략
      if (adjusted !== startDate) endDate = adjusted
    } else {
      const parsed = parseDtDateTime(dtEndRaw.value)
      if (parsed.date !== startDate) endDate = parsed.date
      if (parsed.time !== startTime) endTime = parsed.time
    }
  }

  return {
    id: uid,
    title: summary,
    date: startDate,
    endDate,
    time: startTime,
    endTime,
    allDay,
    location,
    description,
    sourceId: source.id,
    color: source.color,
  }
}

/** iCal 텍스트 → CalendarEvent[] */
export function parseIcal(icalText: string, source: CalendarSource): CalendarEvent[] {
  const unfolded = unfold(icalText)
  const events: CalendarEvent[] = []
  const blocks = unfolded.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    if (!block) continue
    const endIdx = block.indexOf('END:VEVENT')
    const content = endIdx !== -1 ? block.slice(0, endIdx) : block
    const event = parseVEvent(content, source)
    if (event) events.push(event)
  }

  return events
}
