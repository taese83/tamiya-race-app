import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {
  getParticipationsByUser,
  getParticipationsByProfile,
  upsertParticipation,
  deleteParticipation,
  assertProfileOwner,
} from '../_lib/db.js'
import {getCategoryForRace} from '../_lib/scoring.js'

/**
 * GET    /api/participations             — 유저 전체 프로필의 참여 목록
 * GET    /api/participations?profileId=N — 특정 프로필의 참여
 * PUT    /api/participations             — body: {profileId, raceId, wrId, rank?, category?}
 * DELETE /api/participations?profileId=N&raceId=X
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const profileIdRaw = req.query['profileId']
    const profileIdStr = Array.isArray(profileIdRaw) ? profileIdRaw[0] : profileIdRaw
    try {
      if (profileIdStr) {
        const profileId = Number(profileIdStr)
        if (!Number.isFinite(profileId)) { res.status(400).json({error: 'invalid profileId'}); return }
        const ok = await assertProfileOwner(user.sub, profileId)
        if (!ok) { res.status(403).json({error: 'forbidden'}); return }
        const rows = await getParticipationsByProfile(profileId)
        res.status(200).json({participations: rows})
      } else {
        const rows = await getParticipationsByUser(user.sub)
        res.status(200).json({participations: rows})
      }
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  if (req.method === 'PUT') {
    let body: {profileId?: unknown; raceId?: unknown; wrId?: unknown; rank?: unknown; category?: unknown} = {}
    if (typeof req.body === 'object' && req.body != null) body = req.body as typeof body
    else {
      const raw = await readBody(req)
      try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
    }

    const profileId = Number(body.profileId)
    const raceId = typeof body.raceId === 'string' ? body.raceId : ''
    const wrId = typeof body.wrId === 'string' ? body.wrId : ''
    if (!Number.isFinite(profileId) || !raceId || !wrId || raceId.length > 128) {
      res.status(400).json({error: 'profileId, raceId, wrId required'})
      return
    }
    let rank: number | null = null
    if (body.rank === 1 || body.rank === 2 || body.rank === 3) rank = body.rank
    else if (body.rank != null) {
      res.status(400).json({error: 'rank must be 1|2|3|null'})
      return
    }

    try {
      const ok = await assertProfileOwner(user.sub, profileId)
      if (!ok) { res.status(403).json({error: 'forbidden'}); return }

      // category — 클라이언트 제공 우선, 없으면 서버가 races.json에서 판정
      let category: string | null = null
      if (typeof body.category === 'string' && body.category.length > 0 && body.category.length <= 30) {
        category = body.category
      } else {
        const host = req.headers.host ?? 'localhost:5173'
        category = await getCategoryForRace(raceId, host)
      }

      await upsertParticipation(profileId, raceId, wrId, rank, category)
      res.status(200).json({ok: true, profile_id: profileId, race_id: raceId, wr_id: wrId, rank, category})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  if (req.method === 'DELETE') {
    const profileIdRaw = req.query['profileId']
    const raceIdRaw = req.query['raceId']
    const profileId = Number(Array.isArray(profileIdRaw) ? profileIdRaw[0] : profileIdRaw)
    const raceId = Array.isArray(raceIdRaw) ? raceIdRaw[0] : raceIdRaw
    if (!Number.isFinite(profileId) || !raceId || typeof raceId !== 'string') {
      res.status(400).json({error: 'profileId, raceId required'})
      return
    }
    try {
      const ok = await assertProfileOwner(user.sub, profileId)
      if (!ok) { res.status(403).json({error: 'forbidden'}); return }
      await deleteParticipation(profileId, raceId)
      res.status(200).json({ok: true})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  res.status(405).json({error: 'GET, PUT, or DELETE'})
}

async function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
