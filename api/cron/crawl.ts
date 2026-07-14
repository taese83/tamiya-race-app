/**
 * Vercel Cron Job — 매일 0시(UTC) 크롤링 후 KV에 저장
 * vercel.json: { "crons": [{ "path": "/api/cron/crawl", "schedule": "0 15 * * *" }] }
 * UTC 15:00 = KST 00:00 (UTC+9)
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {kv} from '@vercel/kv'
import {fetchRaces} from '../../lib/crawler.js'

export const maxDuration = 60  // 최대 60초 (Vercel Pro 필요, Hobby는 10초)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron은 Authorization 헤더를 자동 추가, 직접 호출 방어
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({error: 'Unauthorized'})
  }

  try {
    console.log('[cron] 크롤링 시작')
    const races = await fetchRaces()

    await kv.set('races:list', JSON.stringify(races))
    await kv.set('races:cachedAt', new Date().toISOString())

    console.log(`[cron] 크롤링 완료: ${races.length}건`)
    return res.json({ok: true, count: races.length, cachedAt: new Date().toISOString()})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron] 크롤링 실패:', message)
    return res.status(502).json({ok: false, error: message})
  }
}
