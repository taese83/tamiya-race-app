import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {assertProfileOwner, setManualScore, upsertUser} from '../_lib/db.js'
import {CLASS_LIST} from '../_lib/scoring.js'

/**
 * PUT /api/scores/manual
 *   body: {profileId, class, participate, rank1, rank2, rank3}
 * 클래스별 수동 카운트 덮어쓰기.
 * 점수는 서버가 참여1 + 1등5 + 2등3 + 3등1 규칙으로 계산.
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

  let body: {
    profileId?: unknown; class?: unknown;
    participate?: unknown; rank1?: unknown; rank2?: unknown; rank3?: unknown;
  } = {}
  if (typeof req.body === 'object' && req.body != null) body = req.body as typeof body
  else {
    const raw = await readBody(req)
    try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
  }

  const profileId = Number(body.profileId)
  const cls = typeof body.class === 'string' ? body.class : ''

  if (!Number.isFinite(profileId) || profileId <= 0) {
    res.status(400).json({error: 'profileId required'})
    return
  }
  if (!(CLASS_LIST as readonly string[]).includes(cls)) {
    res.status(400).json({error: `class must be one of ${CLASS_LIST.join(', ')}`})
    return
  }

  const readCount = (v: unknown, name: string): {ok: true; value: number} | {ok: false; error: string} => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000) {
      return {ok: false, error: `${name} must be 0..10000`}
    }
    return {ok: true, value: Math.floor(v)}
  }
  const p = readCount(body.participate, 'participate')
  const r1 = readCount(body.rank1, 'rank1')
  const r2 = readCount(body.rank2, 'rank2')
  const r3 = readCount(body.rank3, 'rank3')
  if (!p.ok) { res.status(400).json({error: p.error}); return }
  if (!r1.ok) { res.status(400).json({error: r1.error}); return }
  if (!r2.ok) { res.status(400).json({error: r2.error}); return }
  if (!r3.ok) { res.status(400).json({error: r3.error}); return }

  try {
    const ok = await assertProfileOwner(user.sub, profileId)
    if (!ok) { res.status(403).json({error: 'forbidden'}); return }
    await setManualScore(profileId, cls, {
      participate: p.value, rank1: r1.value, rank2: r2.value, rank3: r3.value,
    })
    res.status(200).json({
      ok: true, profile_id: profileId, class: cls,
      participate: p.value, rank1: r1.value, rank2: r2.value, rank3: r3.value,
    })
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
