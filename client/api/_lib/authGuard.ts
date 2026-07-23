import type {VercelRequest, VercelResponse} from '@vercel/node'
import {readSessionCookie, verifySession, type SessionPayload} from './session.js'

/** 세션 있으면 payload 반환, 없으면 401 + null. 호출자는 null이면 즉시 return. */
export async function requireSession(
  req: VercelRequest,
  res: VercelResponse,
): Promise<SessionPayload | null> {
  const token = readSessionCookie(req.headers.cookie)
  if (!token) {
    res.status(401).json({error: 'unauthenticated'})
    return null
  }
  const payload = await verifySession(token)
  if (!payload) {
    res.status(401).json({error: 'invalid_session'})
    return null
  }
  return payload
}
