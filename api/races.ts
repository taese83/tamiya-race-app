/**
 * GET /api/races — KV에서 대회 목록 반환
 * KV에 데이터가 없으면 최초 1회 크롤링 후 저장 (cold start)
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {kv} from '@vercel/kv'
import {fetchRaces} from '../lib/crawler.js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // CORS — 모든 오리진 허용 (정적 사이트와 같은 도메인이므로 실질적으로 same-origin)
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    let races = await kv.get<string>('races:list')
    let cachedAt = await kv.get<string>('races:cachedAt')

    // KV에 데이터 없으면 즉시 크롤링 (초기 배포 후 첫 접속)
    if (!races) {
      console.log('[races] KV 캐시 없음 — 즉시 크롤링')
      const fresh = await fetchRaces()
      await kv.set('races:list', JSON.stringify(fresh))
      cachedAt = new Date().toISOString()
      await kv.set('races:cachedAt', cachedAt)
      races = JSON.stringify(fresh)
    }

    const data = typeof races === 'string' ? JSON.parse(races) : races

    return res.json({
      ok: true,
      data,
      count: Array.isArray(data) ? data.length : 0,
      cachedAt: cachedAt ?? new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[races] 오류:', message)
    return res.status(502).json({ok: false, error: '데이터를 불러오지 못했습니다.', detail: message})
  }
}
