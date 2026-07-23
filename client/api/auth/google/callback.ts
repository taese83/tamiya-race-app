import type {VercelRequest, VercelResponse} from '@vercel/node'
import {createRemoteJWKSet, jwtVerify} from 'jose'
import {readStateCookie, verifyState, clearStateCookie} from '../../_lib/oauth.js'
import {signSession, buildSessionCookie, isSecureRequest} from '../../_lib/session.js'
import {upsertUser, ensureDefaultProfile} from '../../_lib/db.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

interface GoogleTokenResponse {
  access_token?: string
  id_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env['GOOGLE_CLIENT_ID']
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET']
  const redirectUri = process.env['GOOGLE_REDIRECT_URI']
  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).send('OAuth 환경 변수 미설정')
    return
  }

  const codeRaw = req.query['code']
  const stateRaw = req.query['state']
  const errorRaw = req.query['error']

  if (typeof errorRaw === 'string') {
    res.redirect(302, `/?auth_error=${encodeURIComponent(errorRaw)}`)
    return
  }
  const code = typeof codeRaw === 'string' ? codeRaw : ''
  const state = typeof stateRaw === 'string' ? stateRaw : ''

  const cookieState = readStateCookie(req.headers.cookie)
  const secure = isSecureRequest(req.headers.host)

  if (!verifyState(state, cookieState)) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=invalid_state')
    return
  }

  // code → token 교환
  let tokenPayload: GoogleTokenResponse
  try {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body,
    })
    tokenPayload = await tokenRes.json() as GoogleTokenResponse
    if (!tokenRes.ok || !tokenPayload.id_token) {
      res.setHeader('Set-Cookie', clearStateCookie(secure))
      res.redirect(302, `/?auth_error=${encodeURIComponent(tokenPayload.error ?? 'token_exchange_failed')}`)
      return
    }
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=token_fetch_failed')
    return
  }

  // id_token 검증
  let claims: {sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean}
  try {
    const {payload} = await jwtVerify(tokenPayload.id_token, JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    claims = payload as typeof claims
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=id_token_invalid')
    return
  }

  if (!claims.sub || !claims.email || !claims.name) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=missing_profile')
    return
  }
  if (claims.email_verified === false) {
    res.setHeader('Set-Cookie', clearStateCookie(secure))
    res.redirect(302, '/?auth_error=email_unverified')
    return
  }

  // DB에 user profile upsert + default profile 보장 (DB 스키마가 아직 없으면 무시)
  try {
    await upsertUser({id: claims.sub, email: claims.email, name: claims.name, picture: claims.picture})
    await ensureDefaultProfile(claims.sub, claims.name)
  } catch (err) {
    console.warn('[auth] user/profile upsert 실패 (DB 미초기화 가능):', err instanceof Error ? err.message : err)
  }

  const session = await signSession({
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  })

  // state cookie 제거 + session cookie 설정
  res.setHeader('Set-Cookie', [
    clearStateCookie(secure),
    buildSessionCookie(session, secure),
  ])
  res.redirect(302, '/')
}
