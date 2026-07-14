/**
 * GET /api/races/:wrId/detail — 대회 상세 (참가비·접수기한·접수방법·접수URL)
 * KV에 캐시된 상세 데이터가 있으면 반환, 없으면 크롤링 후 KV에 저장 (TTL 1일)
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {kv} from '@vercel/kv'
import {fetchRaceDetail} from '../../../lib/crawler.js'

const DETAIL_TTL_SECONDS = 60 * 60 * 24  // 1일

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const {wrId} = req.query
  if (typeof wrId !== 'string' || !/^\d+$/.test(wrId)) {
    return res.status(400).json({ok: false, error: '유효하지 않은 wrId입니다.'})
  }

  const kvKey = `race:detail:${wrId}`

  try {
    // KV 캐시 확인
    const cached = await kv.get<string>(kvKey)
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached
      return res.json({ok: true, data, fromCache: true})
    }

    // 캐시 없으면 크롤링
    console.log(`[detail] 크롤링: wrId=${wrId}`)
    const detail = await fetchRaceDetail(wrId)

    await kv.set(kvKey, JSON.stringify(detail), {ex: DETAIL_TTL_SECONDS})

    return res.json({ok: true, data: detail, fromCache: false})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[detail] 오류 wrId=${wrId}:`, message)
    return res.status(502).json({ok: false, error: '상세 정보를 불러오지 못했습니다.', detail: message})
  }
}
