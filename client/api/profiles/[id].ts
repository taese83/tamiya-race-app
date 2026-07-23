import type {VercelRequest, VercelResponse} from '@vercel/node'
import {requireSession} from '../_lib/authGuard.js'
import {updateProfile, deleteProfile} from '../_lib/db.js'

/**
 * PUT    /api/profiles/:id  — body: {name?: string, isDefault?: boolean}
 * DELETE /api/profiles/:id
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireSession(req, res)
  if (!user) return

  const idRaw = req.query['id']
  const idStr = Array.isArray(idRaw) ? idRaw[0] : idRaw
  const profileId = Number(idStr)
  if (!Number.isFinite(profileId) || profileId <= 0) {
    res.status(400).json({error: 'invalid profile id'})
    return
  }

  if (req.method === 'PUT') {
    let body: {name?: unknown; isDefault?: unknown} = {}
    if (typeof req.body === 'object' && req.body != null) body = req.body as typeof body
    else {
      const raw = await readBody(req)
      try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
    }
    const patch: {name?: string; isDefault?: boolean} = {}
    if (typeof body.name === 'string') {
      const t = body.name.trim()
      if (t.length === 0 || t.length > 30) {
        res.status(400).json({error: 'name must be 1-30 chars'})
        return
      }
      patch.name = t
    }
    if (typeof body.isDefault === 'boolean') patch.isDefault = body.isDefault
    if (Object.keys(patch).length === 0) {
      res.status(400).json({error: 'no changes'})
      return
    }
    try {
      const row = await updateProfile(user.sub, profileId, patch)
      if (!row) { res.status(404).json({error: 'not_found'}); return }
      res.status(200).json({profile: row})
    } catch (err) {
      res.status(500).json({error: err instanceof Error ? err.message : 'db error'})
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      const result = await deleteProfile(user.sub, profileId)
      if (!result.deleted) {
        const status = result.reason === 'not_found' ? 404 : 400
        res.status(status).json({error: result.reason ?? 'delete_failed'})
        return
      }
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
