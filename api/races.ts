/**
 * GET /api/races
 * 빌드 시 번들된 data/races.json을 반환
 * Vercel Serverless에서 정적 파일은 process.cwd() 기준으로 접근
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=3600')  // 1시간 브라우저 캐시

  try {
    const filePath = resolve(process.cwd(), 'data/races.json')
    const raw = readFileSync(filePath, 'utf-8')
    const payload = JSON.parse(raw) as {data: unknown; count: number; cachedAt: string}
    return res.json({ok: true, ...payload})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[races] 파일 읽기 실패:', message)
    return res.status(503).json({
      ok: false,
      error: '데이터 준비 중입니다. 잠시 후 다시 시도해주세요.',
      detail: message,
    })
  }
}
