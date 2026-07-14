/**
 * POST /api/races/refresh — 수동 재크롤링 트리거
 * 앱 내 "새로고침" 버튼이 이 엔드포인트를 호출
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {kv} from '@vercel/kv'
import {fetchRaces} from '../../lib/crawler.js'

export const maxDuration = 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method Not Allowed'})
  }

  try {
    console.log('[refresh] 수동 재크롤링 시작')
    const races = await fetchRaces()

    await kv.set('races:list', JSON.stringify(races))
    const cachedAt = new Date().toISOString()
    await kv.set('races:cachedAt', cachedAt)

    console.log(`[refresh] 완료: ${races.length}건`)
    return res.json({ok: true, data: races, count: races.length, cachedAt})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[refresh] 오류:', message)
    return res.status(502).json({ok: false, error: '크롤링에 실패했습니다.', detail: message})
  }
}
