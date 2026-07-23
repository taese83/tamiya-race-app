/**
 * 크롤링 스크립트 — GitHub Actions에서 실행
 * 목록 + 상세(참가비·접수기한·접수방법) 를 수집해 data/races.json에 병합 저장
 *
 * 병합 정책:
 *   - 이번 크롤에 등장한 wrId → 해당 wrId의 entries와 detail을 완전 교체 (게시글 편집 반영)
 *   - 이번 크롤에 등장하지 않은 wrId → 기존 entries와 detail을 그대로 유지 (무제한 보존)
 *   - race.id는 date+venue+time+category 기반 stable hash라 종목 순서가 바뀌어도 유지됨
 */
import {existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {fetchRaces, fetchRaceDetail} from '../lib/crawler.js'
import type {RaceEntry, RaceDetail} from '../lib/crawler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// 전체 아카이브 — 병합 축적. 캘린더 뷰, 즐겨찾기 히스토리, 상세 lookup 소스
const OUTPUT_PATH = resolve(__dirname, '../data/races.json')
const ACTIVE_OUTPUT_PATH = resolve(__dirname, '../data/races-active.json')
// dev server가 static으로 서빙하는 위치 — crawl 결과가 즉시 브라우저에 반영되도록 함께 갱신
const CLIENT_PUBLIC_PATH = resolve(__dirname, '../client/public/races.json')
const CLIENT_PUBLIC_ACTIVE_PATH = resolve(__dirname, '../client/public/races-active.json')

interface StoredPayload {
  data: RaceEntry[]
  details: Record<string, RaceDetail>
  count: number
  cachedAt: string
}

// 이번 크롤에 등장한 고유 wrId
function uniqueWrIds(races: RaceEntry[]): string[] {
  const seen = new Set<string>()
  for (const r of races) {
    if (r.wrId) seen.add(r.wrId)
  }
  return Array.from(seen)
}

function loadExisting(): StoredPayload {
  if (!existsSync(OUTPUT_PATH)) {
    return {data: [], details: {}, count: 0, cachedAt: ''}
  }
  try {
    const raw = readFileSync(OUTPUT_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<StoredPayload>
    // 기존 파일이 legacy 스키마 (wrId 필드 없이 id = "wrId-idx")인 경우 wrId를 파생해 채운다
    const data = (parsed.data ?? []).map(r => {
      if (typeof (r as RaceEntry).wrId === 'string' && (r as RaceEntry).wrId) return r as RaceEntry
      const legacyWrId = (r.id ?? '').split('-')[0] ?? ''
      return {...(r as RaceEntry), wrId: legacyWrId}
    })
    return {
      data,
      details: parsed.details ?? {},
      count: parsed.count ?? 0,
      cachedAt: parsed.cachedAt ?? '',
    }
  } catch (err) {
    console.warn(`[crawl] 기존 races.json 파싱 실패 — 빈 데이터로 시작: ${err instanceof Error ? err.message : err}`)
    return {data: [], details: {}, count: 0, cachedAt: ''}
  }
}

/** 이번 크롤에 등장한 wrId만 교체, 나머지는 보존 */
function mergePayload(
  existing: StoredPayload,
  freshRaces: RaceEntry[],
  freshDetails: Map<string, RaceDetail>,
): StoredPayload {
  const freshWrIds = new Set(freshRaces.map(r => r.wrId).filter(Boolean))

  // 기존 entries에서 이번 크롤 대상 wrId를 제외하고 신규 entries를 추가
  const survivingEntries = existing.data.filter(r => !freshWrIds.has(r.wrId))
  const mergedData = [...survivingEntries, ...freshRaces]

  // 상세도 동일하게 wrId 단위로 병합
  const mergedDetails: Record<string, RaceDetail> = {}
  for (const [wrId, detail] of Object.entries(existing.details)) {
    if (!freshWrIds.has(wrId)) mergedDetails[wrId] = detail
  }
  freshDetails.forEach((detail, wrId) => { mergedDetails[wrId] = detail })

  return {
    data: mergedData,
    details: mergedDetails,
    count: mergedData.length,
    cachedAt: new Date().toISOString(),
  }
}

async function crawlDetailsConcurrent(
  wrIds: string[],
  concurrency = 3,
): Promise<Map<string, RaceDetail>> {
  const map = new Map<string, RaceDetail>()
  let i = 0

  async function worker() {
    while (i < wrIds.length) {
      const wrId = wrIds[i++]!
      try {
        const detail = await fetchRaceDetail(wrId)
        map.set(wrId, detail)
        process.stdout.write(`  상세 ${map.size}/${wrIds.length} (wrId=${wrId})\r`)
      } catch (err) {
        console.warn(`  [skip] wrId=${wrId}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()))
  console.log(`\n  상세 크롤링 완료: ${map.size}/${wrIds.length}건`)
  return map
}

async function main() {
  const existing = loadExisting()
  console.log(`[crawl] 기존 데이터 로드: entries ${existing.data.length}건, details ${Object.keys(existing.details).length}건`)

  console.log('[crawl] 목록 크롤링 시작...')
  const races = await fetchRaces()
  console.log(`[crawl] 목록 ${races.length}건 수집 완료`)

  console.log('[crawl] 상세 크롤링 시작...')
  const wrIds = uniqueWrIds(races)
  console.log(`  고유 wrId: ${wrIds.length}개`)
  const details = await crawlDetailsConcurrent(wrIds)

  const merged = mergePayload(existing, races, details)
  const preserved = merged.data.length - races.length
  console.log(`[crawl] 병합 완료 — 이번 크롤 ${races.length}건, 기존 유지 ${preserved}건, 총 ${merged.count}건 (detail ${Object.keys(merged.details).length}건)`)

  mkdirSync(resolve(__dirname, '../data'), {recursive: true})
  writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), 'utf-8')
  console.log(`[crawl] data/races.json 저장 완료`)

  // races-active.json — 이번 크롤에 사이트에서 실제로 살아있는 게시글만 포함
  // 리스트 뷰가 이걸 소비해 아카이브 축적으로 리스트가 무한히 길어지는 문제를 방지
  const activeDetails: Record<string, RaceDetail> = {}
  details.forEach((v, k) => { activeDetails[k] = v })
  const activePayload: StoredPayload = {
    data: races,
    details: activeDetails,
    count: races.length,
    cachedAt: merged.cachedAt,
  }
  writeFileSync(ACTIVE_OUTPUT_PATH, JSON.stringify(activePayload, null, 2), 'utf-8')
  console.log(`[crawl] data/races-active.json 저장 완료 (active ${races.length}건, detail ${details.size}건)`)

  // dev server (Vite)가 서빙하는 client/public/ 도 함께 갱신
  // Vercel 빌드는 prepare-build.cjs가 처리하지만 로컬 dev에는 이 복사가 필요
  mkdirSync(dirname(CLIENT_PUBLIC_PATH), {recursive: true})
  copyFileSync(OUTPUT_PATH, CLIENT_PUBLIC_PATH)
  copyFileSync(ACTIVE_OUTPUT_PATH, CLIENT_PUBLIC_ACTIVE_PATH)
  console.log(`[crawl] client/public/ 파일 갱신 완료 (races.json + races-active.json)`)
}

main().catch(err => {
  console.error('[crawl] 실패:', err)
  process.exit(1)
})
