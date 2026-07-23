import type {VercelRequest, VercelResponse} from '@vercel/node'
import {buildClearCookie, isSecureRequest} from '../_lib/session.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'POST only'})
    return
  }
  const secure = isSecureRequest(req.headers.host)
  res.setHeader('Set-Cookie', buildClearCookie(secure))
  res.status(200).json({ok: true})
}
