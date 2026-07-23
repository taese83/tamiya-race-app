import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {assertProfileOwner, setManualScore, upsertUser} from '../_lib/db.js'
import {CLASS_LIST} from '../_lib/scoring.js'

/**
 * PUT /api/scores/manual
 *   body: {profileId: number, class: 'M.SPEED'|'M1'|..., points: number}
 * 클래스별 덮어쓰기.
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

  let body: {profileId?: unknown; class?: unknown; points?: unknown} = {}
  if (typeof req.body === 'object' && req.body != null) body = req.body as typeof body
  else {
    const raw = await readBody(req)
    try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
  }

  const profileId = Number(body.profileId)
  const cls = typeof body.class === 'string' ? body.class : ''
  const points = body.points

  if (!Number.isFinite(profileId) || profileId <= 0) {
    res.status(400).json({error: 'profileId required'})
    return
  }
  if (!(CLASS_LIST as readonly string[]).includes(cls)) {
    res.status(400).json({error: `class must be one of ${CLASS_LIST.join(', ')}`})
    return
  }
  if (typeof points !== 'number' || !Number.isFinite(points) || points < 0 || points > 100000) {
    res.status(400).json({error: 'points must be 0..100000'})
    return
  }

  try {
    const ok = await assertProfileOwner(user.sub, profileId)
    if (!ok) { res.status(403).json({error: 'forbidden'}); return }
    const intPoints = Math.floor(points)
    await setManualScore(profileId, cls, intPoints)
    res.status(200).json({ok: true, profile_id: profileId, class: cls, points: intPoints})
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
