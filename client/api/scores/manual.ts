import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {setManualScore, upsertUser} from '../_lib/db.js'

/**
 * PUT /api/scores/manual
 *   body: {points: number} — 덮어쓰기 방식. 최종 total = manual + station 참여 점수.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return
  if (req.method !== 'PUT') {
    res.status(405).json({error: 'PUT only'})
    return
  }

  try {
    await upsertUser({id: user.sub, email: user.email, name: user.name, picture: user.picture})
  } catch (err) {
    res.status(500).json({error: `user upsert failed: ${err instanceof Error ? err.message : err}`})
    return
  }

  let body: {points?: unknown} = {}
  if (typeof req.body === 'object' && req.body != null) {
    body = req.body as typeof body
  } else {
    const raw = await readBody(req)
    try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
  }
  const points = body.points
  if (typeof points !== 'number' || !Number.isFinite(points) || points < 0 || points > 100000) {
    res.status(400).json({error: 'points must be a number 0..100000'})
    return
  }
  const intPoints = Math.floor(points)
  try {
    await setManualScore(user.sub, intPoints)
    res.status(200).json({ok: true, points: intPoints})
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
  }
}

async function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
