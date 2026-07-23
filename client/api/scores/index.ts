import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {getProfiles, getParticipationsByUser, getManualScoresByUser, ensureDefaultProfile, upsertUser} from '../_lib/db.js'
import {computeAggregate} from '../_lib/scoring.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return
  if (req.method !== 'GET') {
    res.status(405).json({error: 'GET only'})
    return
  }
  try {
    await upsertUser({id: user.sub, email: user.email, name: user.name, picture: user.picture})
    await ensureDefaultProfile(user.sub, user.name)
    const [profiles, participations, manuals] = await Promise.all([
      getProfiles(user.sub),
      getParticipationsByUser(user.sub),
      getManualScoresByUser(user.sub),
    ])
    const host = req.headers.host ?? 'localhost:5173'
    const result = await computeAggregate(profiles, participations, manuals, host)
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'compute error'})
  }
}
