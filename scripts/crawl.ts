/**
 * 크롤링 스크립트 — GitHub Actions에서 실행
 * 실행: pnpm crawl
 * 결과: data/races.json 생성
 */
import {writeFileSync, mkdirSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {fetchRaces} from '../lib/crawler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '../data/races.json')

async function main() {
  console.log('[crawl] 크롤링 시작...')

  const races = await fetchRaces()
  console.log(`[crawl] ${races.length}건 수집 완료`)

  const payload = {
    data: races,
    count: races.length,
    cachedAt: new Date().toISOString(),
  }

  mkdirSync(resolve(__dirname, '../data'), {recursive: true})
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8')

  console.log(`[crawl] data/races.json 저장 완료`)
}

main().catch(err => {
  console.error('[crawl] 실패:', err)
  process.exit(1)
})
