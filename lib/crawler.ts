/**
 * 타미야 크롤러 — Vercel Serverless Functions와 로컬 server/ 양쪽에서 공유
 * 인메모리 캐시 없음: 캐시는 호출 측(KV 또는 Express 인메모리)이 담당
 */
import axios from 'axios'
import {createHash} from 'crypto'
import * as cheerio from 'cheerio'

const TAMIYA_URL = 'https://tamiya.co.kr/bbs/board.php?bo_table=club_race&ser=0'
const TAMIYA_BASE = 'https://tamiya.co.kr'
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface RaceEntry {
  /** race.id = `${wrId}-${eventKeyHash}` — event 단위 stable id (즐겨찾기 저장 key) */
  id: string
  /** 게시글 wrId — details 맵 lookup 및 병합 단위 */
  wrId: string
  title: string
  venue: string
  date: string       // YYYY.MM.DD
  time: string       // HH:MM
  category: string   // () 제거된 순수 클래스명
  note: string       // () 안 부연설명 (예: 선착순 45명 / 매장 오픈 10:30)
  detailUrl: string
}

/**
 * date + venue + time + category 조합으로 event 단위 안정 hash 생성.
 * 관리자가 종목 순서를 바꾸거나 종목을 추가/삭제해도, 살아있는 event는 같은 id를 유지한다.
 * 즐겨찾기와 React key 안정성 확보 목적.
 */
export function eventKeyHash(date: string, venue: string, time: string, category: string): string {
  const key = `${date}|${venue}|${time}|${category}`
  return createHash('sha1').update(key).digest('hex').slice(0, 8)
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

function parseEvents(eventText: string): Array<{time: string; category: string; note: string}> {
  // () 안의 /는 분리 대상이 아니므로 괄호 밖의 / 만 분리
  const parts: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of eventText) {
    if (ch === '(') { depth++; buf += ch }
    else if (ch === ')') { depth--; buf += ch }
    else if (ch === '/' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) parts.push(buf.trim())

  return parts
    .map(part => {
      // "19:00 OPEN 클래스 (선착순 45명 / 매장 오픈 10:30)" 파싱
      const noteMatch = part.match(/^(.*?)\s*\((.+)\)\s*$/)
      const withoutNote = noteMatch ? noteMatch[1]?.trim() ?? part : part.trim()
      const note = noteMatch ? noteMatch[2]?.trim() ?? '' : ''

      const m = withoutNote.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
      return m
        ? {time: m[1] ?? '', category: m[2]?.trim() ?? withoutNote, note}
        : {time: '', category: withoutNote, note}
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
      const hash = eventKeyHash(date, venue, '', eventText)
      entries.push({id: `${wrId}-${hash}`, wrId, title, venue, date, time: '', category: eventText, note: '', detailUrl})
      return
    }
    events.forEach(ev => {
      const hash = eventKeyHash(date, venue, ev.time, ev.category)
      entries.push({id: `${wrId}-${hash}`, wrId, title, venue, date, time: ev.time, category: ev.category, note: ev.note, detailUrl})
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
