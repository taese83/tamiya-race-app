import axios from 'axios'
import * as cheerio from 'cheerio'

const TAMIYA_URL = 'https://tamiya.co.kr/bbs/board.php?bo_table=club_race&ser=0'
const TAMIYA_BASE = 'https://tamiya.co.kr'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface RaceEntry {
  id: string          // wr_id from URL
  title: string       // 대회명
  venue: string       // 장소
  date: string        // YYYY.MM.DD
  time: string        // HH:MM
  category: string    // 종목명 (분리된 단일 종목)
  detailUrl: string
}

export interface RaceDetail {
  wrId: string
  entranceFee: string         // 참가비
  registrationDeadline: string // 접수 기한
  registrationMethod: string  // 접수 방법
  inquiry: string             // 문의
  applyUrl: string | null     // 온라인 접수 URL (있으면)
  applyButtonText: string | null // 접수 버튼 텍스트
}

interface CrawlCache {
  data: RaceEntry[]
  fetchedAt: number
}

interface DetailCache {
  data: RaceDetail
  fetchedAt: number
}

const CACHE_TTL_MS = 10 * 60 * 1000  // 10분
const DETAIL_CACHE_TTL_MS = 30 * 60 * 1000  // 30분
let cache: CrawlCache | null = null
const detailCache = new Map<string, DetailCache>()

/** 이벤트 문자열을 슬래시로 분리해 각 종목 항목으로 파싱 */
function parseEvents(eventText: string): Array<{time: string; category: string}> {
  const parts = eventText.split(/\s*\/\s*/)
  return parts
    .map(part => {
      const trimmed = part.trim()
      const timeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
      if (timeMatch) {
        return {
          time: timeMatch[1] ?? '',
          category: timeMatch[2]?.trim() ?? trimmed,
        }
      }
      return {time: '', category: trimmed}
    })
    .filter(e => e.category.length > 0)
}

/** wr_id를 URL에서 추출 */
function extractWrId(href: string): string {
  const m = href.match(/wr_id=(\d+)/)
  return m?.[1] ?? ''
}

/** dl 목록에서 dt 이름으로 dd 값 추출 */
function extractDlValue($: cheerio.CheerioAPI, container: cheerio.Cheerio<cheerio.Element>, dtText: string): string {
  let found = ''
  container.find('dl').each((_i, dl) => {
    const dtEl = $(dl).find('dt')
    if (dtEl.text().trim() === dtText) {
      found = $(dl).find('dd').text().trim()
      return false // break
    }
  })
  return found
}

/**
 * 접수 방법 텍스트에서 온라인 접수 URL 추출
 * "아래 '접수하기' 버튼을 눌러서 온라인 접수" 패턴 감지 후
 * bo_v_con 또는 본문에서 버튼/링크를 탐색
 */
function extractApplyInfo($: cheerio.CheerioAPI): {url: string | null; buttonText: string | null} {
  const method = extractDlValue($, $('.container_club_race'), '접수 방법')
  const isOnline =
    method.includes('접수하기') || method.includes('온라인 접수') || method.includes('버튼')

  if (!isOnline) return {url: null, buttonText: null}

  // bo_v_con(본문)에서 접수 관련 링크/버튼 탐색
  const content = $('#bo_v_con, .bo_v_custom_field')
  let applyUrl: string | null = null
  let buttonText: string | null = null

  // 1순위: "접수하기" 텍스트를 포함한 링크
  content.find('a').each((_i, el) => {
    const text = $(el).text().trim()
    const href = $(el).attr('href') ?? ''
    if (
      text.includes('접수하기') || text.includes('접수') ||
      href.includes('apply') || href.includes('challenge') || href.includes('mini_car')
    ) {
      applyUrl = href.startsWith('http') ? href : `${TAMIYA_BASE}${href}`
      buttonText = text || '접수하기'
      return false
    }
  })

  // 2순위: onClick 등 js 기반 버튼
  if (!applyUrl) {
    content.find('button, [onclick]').each((_i, el) => {
      const text = $(el).text().trim()
      const onclick = $(el).attr('onclick') ?? ''
      if (text.includes('접수') || onclick.includes('apply')) {
        buttonText = text || '접수하기'
        // onclick에서 URL 추출 시도
        const urlMatch = onclick.match(/['"]([^'"]*(?:apply|challenge|mini_car)[^'"]*)['"]/i)
        if (urlMatch?.[1]) {
          applyUrl = urlMatch[1].startsWith('http') ? urlMatch[1] : `${TAMIYA_BASE}${urlMatch[1]}`
        }
        return false
      }
    })
  }

  // 3순위: 타미야 공식 접수 페이지 링크가 있는 경우
  if (!applyUrl) {
    content.find('a[href*="challenge"], a[href*="apply"]').each((_i, el) => {
      const href = $(el).attr('href') ?? ''
      applyUrl = href.startsWith('http') ? href : `${TAMIYA_BASE}${href}`
      buttonText = $(el).text().trim() || '접수하기'
      return false
    })
  }

  return {url: applyUrl, buttonText: buttonText ?? (isOnline ? '접수하기' : null)}
}

export async function crawlRaces(): Promise<RaceEntry[]> {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  const response = await axios.get<string>(TAMIYA_URL, {
    headers: {'User-Agent': USER_AGENT},
    responseType: 'text',
    timeout: 15_000,
  })

  const $ = cheerio.load(response.data)
  const entries: RaceEntry[] = []

  $('tr').each((_i, row) => {
    const tds = $(row).find('td')
    if (tds.length < 4) return

    const categories = tds.filter('.category')
    if (categories.length < 2) return

    const titleEl = categories.eq(0)
    const venueEl = categories.eq(1)
    const dateEl = tds.filter('.date')
    const eventEl = tds.filter('.event')

    const title = titleEl.text().trim()
    const venue = venueEl.text().trim()
    const date = dateEl.text().trim()
    const eventText = eventEl.text().trim()
    const detailHref = titleEl.find('a').attr('href') ?? ''
    const wrId = extractWrId(detailHref)
    const detailUrl = detailHref
      ? detailHref.startsWith('http')
        ? detailHref
        : `${TAMIYA_BASE}${detailHref}`
      : ''

    if (!title || !date) return

    const events = parseEvents(eventText)
    if (events.length === 0) {
      entries.push({id: `${wrId}-0`, title, venue, date, time: '', category: eventText, detailUrl})
      return
    }

    events.forEach((ev, idx) => {
      entries.push({
        id: `${wrId}-${idx}`,
        title,
        venue,
        date,
        time: ev.time,
        category: ev.category,
        detailUrl,
      })
    })
  })

  cache = {data: entries, fetchedAt: now}
  return entries
}

export async function crawlRaceDetail(wrId: string): Promise<RaceDetail> {
  const now = Date.now()
  const cached = detailCache.get(wrId)
  if (cached && now - cached.fetchedAt < DETAIL_CACHE_TTL_MS) {
    return cached.data
  }

  const url = `${TAMIYA_BASE}/bbs/board.php?bo_table=club_race&wr_id=${wrId}`
  const response = await axios.get<string>(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': TAMIYA_BASE,
    },
    responseType: 'text',
    timeout: 15_000,
  })

  const $ = cheerio.load(response.data)
  const container = $('.container_club_race')

  const detail: RaceDetail = {
    wrId,
    entranceFee: extractDlValue($, container, '참가비'),
    registrationDeadline: extractDlValue($, container, '접수 기한'),
    registrationMethod: extractDlValue($, container, '접수 방법'),
    inquiry: extractDlValue($, container, '문의'),
    applyUrl: null,
    applyButtonText: null,
  }

  const {url: applyUrl, buttonText} = extractApplyInfo($)
  detail.applyUrl = applyUrl
  detail.applyButtonText = buttonText

  detailCache.set(wrId, {data: detail, fetchedAt: now})
  return detail
}

export function clearCache() {
  cache = null
  detailCache.clear()
}
