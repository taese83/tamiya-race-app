import type {VercelRequest, VercelResponse} from '@vercel/node'
import {readSessionCookie, verifySession} from '../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = readSessionCookie(req.headers.cookie)
  if (!token) {
    res.status(200).json({authenticated: false})
    return
  }
  const payload = await verifySession(token)
  if (!payload) {
    res.status(200).json({authenticated: false})
    return
  }
  res.status(200).json({
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    },
  })
}
