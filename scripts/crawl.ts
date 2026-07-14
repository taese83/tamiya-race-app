/**
 * 크롤링 스크립트 — GitHub Actions에서 실행
 * 목록 + 상세(참가비·접수기한·접수방법) 를 모두 수집해 data/races.json 저장
 */
import {writeFileSync, mkdirSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {fetchRaces, fetchRaceDetail} from '../lib/crawler.js'
import type {RaceEntry, RaceDetail} from '../lib/crawler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '../data/races.json')

// 동일 wrId 중복 크롤링 방지
function uniqueWrIds(races: RaceEntry[]): string[] {
  const seen = new Set<string>()
  for (const r of races) {
    const wrId = r.id.split('-')[0] ?? ''
    if (wrId) seen.add(wrId)
  }
  return Array.from(seen)
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
  console.log('[crawl] 목록 크롤링 시작...')
  const races = await fetchRaces()
  console.log(`[crawl] 목록 ${races.length}건 수집 완료`)

  console.log('[crawl] 상세 크롤링 시작...')
  const wrIds = uniqueWrIds(races)
  console.log(`  고유 wrId: ${wrIds.length}개`)
  const details = await crawlDetailsConcurrent(wrIds)

  // 상세 정보를 Map으로 변환해 저장
  const detailsRecord: Record<string, RaceDetail> = {}
  details.forEach((v, k) => { detailsRecord[k] = v })

  const payload = {
    data: races,
    details: detailsRecord,
    count: races.length,
    cachedAt: new Date().toISOString(),
  }

  mkdirSync(resolve(__dirname, '../data'), {recursive: true})
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`[crawl] data/races.json 저장 완료 (목록 ${races.length}건, 상세 ${details.size}건)`)
}

main().catch(err => {
  console.error('[crawl] 실패:', err)
  process.exit(1)
})
