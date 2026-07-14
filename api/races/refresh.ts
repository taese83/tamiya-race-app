/**
 * POST /api/races/refresh
 * 파일 기반 방식에서 "새로고침"은 GitHub Actions를 수동 트리거하는 것으로 대체.
 * 이 엔드포인트는 현재 캐시된 데이터를 그대로 반환하며,
 * 실제 재크롤링은 GitHub Actions > "Run workflow"로 수행.
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method Not Allowed'})
  }

  try {
    const filePath = resolve(process.cwd(), 'data/races.json')
    const raw = readFileSync(filePath, 'utf-8')
    const payload = JSON.parse(raw) as {data: unknown; count: number; cachedAt: string}
    return res.json({ok: true, ...payload})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return res.status(503).json({ok: false, error: '데이터 준비 중입니다.', detail: message})
  }
}
