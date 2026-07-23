import type {VercelRequest, VercelResponse} from '@vercel/node'
import {issueState, buildStateCookie} from '../../_lib/oauth.js'
import {isSecureRequest} from '../../_lib/session.js'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env['GOOGLE_CLIENT_ID']
  const redirectUri = process.env['GOOGLE_REDIRECT_URI']
  if (!clientId || !redirectUri) {
    res.status(500).json({error: 'OAuth 환경 변수 미설정 (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI)'})
    return
  }

  const {state, cookieValue} = issueState()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })

  const secure = isSecureRequest(req.headers.host)
  res.setHeader('Set-Cookie', buildStateCookie(cookieValue, secure))
  res.redirect(302, `${AUTH_URL}?${params.toString()}`)
}
