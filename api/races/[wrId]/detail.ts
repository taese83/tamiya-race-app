/**
 * GET /api/races/:wrId/detail
 * 상세 정보는 빌드 번들에 포함되지 않아 요청 시 직접 크롤링
 * (상세는 클릭 시에만 로드되므로 빈도가 낮음)
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {fetchRaceDetail} from '../../../lib/crawler.js'

export const maxDuration = 15

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=86400')  // 1일 캐시

  const {wrId} = req.query
  if (typeof wrId !== 'string' || !/^\d+$/.test(wrId)) {
    return res.status(400).json({ok: false, error: '유효하지 않은 wrId입니다.'})
  }

  try {
    const detail = await fetchRaceDetail(wrId)
    return res.json({ok: true, data: detail})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[detail] 오류 wrId=${wrId}:`, message)
    return res.status(502).json({ok: false, error: '상세 정보를 불러오지 못했습니다.', detail: message})
  }
}
