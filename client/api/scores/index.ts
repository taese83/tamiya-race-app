import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {getParticipations, getManualScore} from '../_lib/db.js'
import {computeScore} from '../_lib/scoring.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return
  if (req.method !== 'GET') {
    res.status(405).json({error: 'GET only'})
    return
  }
  try {
    const [rows, manual] = await Promise.all([
      getParticipations(user.sub),
      getManualScore(user.sub),
    ])
    const host = req.headers.host ?? 'localhost:5173'
    const breakdown = await computeScore(rows, manual, host)
    res.status(200).json(breakdown)
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'compute error'})
  }
}
