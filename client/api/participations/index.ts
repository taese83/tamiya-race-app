import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {getParticipations} from '../_lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return
  if (req.method !== 'GET') {
    res.status(405).json({error: 'GET only'})
    return
  }
  try {
    const rows = await getParticipations(user.sub)
    res.status(200).json({participations: rows})
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
  }
}
