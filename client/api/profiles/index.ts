import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {ensureDefaultProfile, getProfiles, createProfile, upsertUser} from '../_lib/db.js'

/**
 * GET  /api/profiles       — 로그인 사용자의 프로필 목록. default profile 없으면 자동 생성
 * POST /api/profiles       — body: {name}
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return

  // users 행 보장 (외래키)
  try {
    await upsertUser({id: user.sub, email: user.email, name: user.name, picture: user.picture})
  } catch (err) {
    res.status(500).json({error: `user upsert failed: ${err instanceof Error ? err.message : err}`})
    return
  }

  if (req.method === 'GET') {
    try {
      // default 프로필 없으면 자동 생성 후 목록 조회
      await ensureDefaultProfile(user.sub, user.name)
      const rows = await getProfiles(user.sub)
      res.status(200).json({profiles: rows})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  if (req.method === 'POST') {
    let body: {name?: unknown} = {}
    if (typeof req.body === 'object' && req.body != null) body = req.body as typeof body
    else {
      const raw = await readBody(req)
      try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
    }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 30) {
      res.status(400).json({error: 'name required (1-30 chars)'})
      return
    }
    try {
      const row = await createProfile(user.sub, name)
      res.status(200).json({profile: row})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  res.status(405).json({error: 'GET or POST'})
}

async function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
