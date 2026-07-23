import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {upsertParticipation, deleteParticipation, upsertUser} from '../_lib/db.js'

/**
 * PUT /api/participations/:raceId  — upsert (참가 체크 + optional rank)
 *   body: {wrId: string, rank?: 1|2|3|null}
 * DELETE /api/participations/:raceId — remove
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return

  const raceIdRaw = req.query['raceId']
  const raceId = Array.isArray(raceIdRaw) ? raceIdRaw[0] : raceIdRaw
  if (!raceId || typeof raceId !== 'string' || raceId.length > 128) {
    res.status(400).json({error: 'invalid raceId'})
    return
  }

  // 사용자 upsert (첫 mutation 시 users 행이 없으면 FK 위반)
  try {
    await upsertUser({id: user.sub, email: user.email, name: user.name, picture: user.picture})
  } catch (err) {
    res.status(500).json({error: `user upsert failed: ${err instanceof Error ? err.message : err}`})
    return
  }

  if (req.method === 'PUT') {
    // body 파싱 (Vercel는 자동 파싱, vite middleware는 raw stream → 아래에서 처리)
    let body: {wrId?: unknown; rank?: unknown} = {}
    if (typeof req.body === 'object' && req.body != null) {
      body = req.body as typeof body
    } else {
      // stream에서 읽기
      const raw = await readBody(req)
      try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
    }
    const wrId = typeof body.wrId === 'string' ? body.wrId : ''
    if (!wrId) {
      res.status(400).json({error: 'wrId required'})
      return
    }
    const rankRaw = body.rank
    let rank: number | null = null
    if (rankRaw === 1 || rankRaw === 2 || rankRaw === 3) rank = rankRaw
    else if (rankRaw != null) {
      res.status(400).json({error: 'rank must be 1|2|3|null'})
      return
    }
    try {
      await upsertParticipation(user.sub, raceId, wrId, rank)
      res.status(200).json({ok: true, race_id: raceId, wr_id: wrId, rank})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      await deleteParticipation(user.sub, raceId)
      res.status(200).json({ok: true})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  res.status(405).json({error: 'PUT or DELETE'})
}

async function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
