/**
 * 타미야 크롤러 — Vercel Serverless Functions와 로컬 server/ 양쪽에서 공유
 * 인메모리 캐시 없음: 캐시는 호출 측(KV 또는 Express 인메모리)이 담당
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

const TAMIYA_URL = 'https://tamiya.co.kr/bbs/board.php?bo_table=club_race&ser=0'
const TAMIYA_BASE = 'https://tamiya.co.kr'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface RaceEntry {
  id: string
  title: string
  venue: string
  date: string       // YYYY.MM.DD
  time: string       // HH:MM
  category: string
  detailUrl: string
}

export interface RaceDetail {
  wrId: string
  entranceFee: string
  registrationDeadline: string
  registrationMethod: string
  inquiry: string
  applyUrl: string | null
  applyButtonText: string | null
}

function parseEvents(eventText: string): Array<{time: string; category: string}> {
  return eventText
    .split(/\s*\/\s*/)
    .map(part => {
      const trimmed = part.trim()
      const m = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
      return m
        ? {time: m[1] ?? '', category: m[2]?.trim() ?? trimmed}
        : {time: '', category: trimmed}
    })
    .filter(e => e.category.length > 0)
}

function extractWrId(href: string): string {
  return href.match(/wr_id=(\d+)/)?.[1] ?? ''
}

function extractDlValue(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<cheerio.Element>,
  dtText: string,
): string {
  let found = ''
  container.find('dl').each((_i, dl) => {
    if ($(dl).find('dt').text().trim() === dtText) {
      found = $(dl).find('dd').text().trim()
      return false
    }
  })
  return found
}

function extractApplyInfo($: cheerio.CheerioAPI): {url: string | null; buttonText: string | null} {
  const method = extractDlValue($, $('.container_club_race'), '접수 방법')
  const isOnline =
    method.includes('접수하기') || method.includes('온라인 접수') || method.includes('버튼')

  if (!isOnline) return {url: null, buttonText: null}

  const content = $('#bo_v_con, .bo_v_custom_field')
  let applyUrl: string | null = null
  let buttonText: string | null = null

  content.find('a').each((_i, el) => {
    const text = $(el).text().trim()
    const href = $(el).attr('href') ?? ''
    if (text.includes('접수하기') || text.includes('접수') || href.includes('challenge') || href.includes('mini_car')) {
      applyUrl = href.startsWith('http') ? href : `${TAMIYA_BASE}${href}`
      buttonText = text || '접수하기'
      return false
    }
  })

  if (!applyUrl) {
    content.find('a[href*="challenge"], a[href*="apply"]').each((_i, el) => {
      const href = $(el).attr('href') ?? ''
      applyUrl = href.startsWith('http') ? href : `${TAMIYA_BASE}${href}`
      buttonText = $(el).text().trim() || '접수하기'
      return false
    })
  }

  return {url: applyUrl, buttonText: buttonText ?? '접수하기'}
}

/** 목록 페이지 크롤링 */
export async function fetchRaces(): Promise<RaceEntry[]> {
  const response = await axios.get<string>(TAMIYA_URL, {
    headers: {'User-Agent': USER_AGENT},
    responseType: 'text',
    timeout: 20_000,
  })

  const $ = cheerio.load(response.data)
  const entries: RaceEntry[] = []

  $('tr').each((_i, row) => {
    const tds = $(row).find('td')
    if (tds.length < 4) return
    const cats = tds.filter('.category')
    if (cats.length < 2) return

    const title = cats.eq(0).text().trim()
    const venue = cats.eq(1).text().trim()
    const date = tds.filter('.date').text().trim()
    const eventText = tds.filter('.event').text().trim()
    const detailHref = cats.eq(0).find('a').attr('href') ?? ''
    const wrId = extractWrId(detailHref)
    const detailUrl = detailHref
      ? detailHref.startsWith('http') ? detailHref : `${TAMIYA_BASE}${detailHref}`
      : ''

    if (!title || !date) return

    const events = parseEvents(eventText)
    if (events.length === 0) {
      entries.push({id: `${wrId}-0`, title, venue, date, time: '', category: eventText, detailUrl})
      return
    }
    events.forEach((ev, idx) => {
      entries.push({id: `${wrId}-${idx}`, title, venue, date, time: ev.time, category: ev.category, detailUrl})
    })
  })

  return entries
}

/** 상세 페이지 크롤링 */
export async function fetchRaceDetail(wrId: string): Promise<RaceDetail> {
  const url = `${TAMIYA_BASE}/bbs/board.php?bo_table=club_race&wr_id=${wrId}`
  const response = await axios.get<string>(url, {
    headers: {'User-Agent': USER_AGENT, 'Accept-Language': 'ko-KR,ko;q=0.9', 'Referer': TAMIYA_BASE},
    responseType: 'text',
    timeout: 20_000,
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
  return detail
}
