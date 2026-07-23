import {SignJWT, jwtVerify} from 'jose'

const COOKIE_NAME = 'tamiya_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30일

export interface SessionPayload {
  sub: string        // Google `sub` (안정 id)
  email: string
  name: string
  picture?: string
}

function secret(): Uint8Array {
  const s = process.env['SESSION_SECRET']
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET 환경 변수 미설정 또는 너무 짧음')
  }
  return new TextEncoder().encode(s)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({...payload})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const {payload} = await jwtVerify(token, secret())
    if (typeof payload['sub'] !== 'string' || typeof payload['email'] !== 'string' || typeof payload['name'] !== 'string') return null
    return {
      sub: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: typeof payload['picture'] === 'string' ? payload['picture'] : undefined,
    }
  } catch {
    return null
  }
}

/** cookie 헤더에서 세션 토큰 추출 */
export function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map(p => p.trim())
  for (const p of parts) {
    if (p.startsWith(`${COOKIE_NAME}=`)) {
      return decodeURIComponent(p.slice(COOKIE_NAME.length + 1))
    }
  }
  return null
}

/** Set-Cookie 값 생성 — production은 secure, sameSite=lax (OAuth 리다이렉트 호환) */
export function buildSessionCookie(token: string, isSecure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SEC}`,
  ]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function buildClearCookie(isSecure: boolean): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function isSecureRequest(host: string | undefined): boolean {
  // Vercel production/preview는 https, 로컬 개발은 http
  return Boolean(host && !host.startsWith('localhost') && !host.startsWith('127.'))
}
