import {randomBytes, createHmac, timingSafeEqual} from 'node:crypto'

const STATE_COOKIE = 'tamiya_oauth_state'
const STATE_MAX_AGE_SEC = 60 * 10 // 10분

function stateSecret(): string {
  const s = process.env['SESSION_SECRET']
  if (!s) throw new Error('SESSION_SECRET 환경 변수 미설정')
  return s
}

/** 랜덤 state + HMAC 서명. cookie에 저장할 값 반환. */
export function issueState(): {state: string; cookieValue: string} {
  const nonce = randomBytes(16).toString('hex')
  const sig = createHmac('sha256', stateSecret()).update(nonce).digest('hex').slice(0, 32)
  const state = `${nonce}.${sig}`
  return {state, cookieValue: state}
}

/** callback state와 cookie state 비교. HMAC로 자체 서명도 재검증. */
export function verifyState(stateParam: string | undefined, cookieValue: string | null): boolean {
  if (!stateParam || !cookieValue) return false
  const paramBuf = Buffer.from(stateParam)
  const cookieBuf = Buffer.from(cookieValue)
  if (paramBuf.length !== cookieBuf.length) return false
  if (!timingSafeEqual(paramBuf, cookieBuf)) return false
  const parts = stateParam.split('.')
  if (parts.length !== 2) return false
  const [nonce, sig] = parts
  if (!nonce || !sig) return false
  const expected = createHmac('sha256', stateSecret()).update(nonce).digest('hex').slice(0, 32)
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}

export function buildStateCookie(value: string, isSecure: boolean): string {
  const attrs = [
    `${STATE_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${STATE_MAX_AGE_SEC}`,
  ]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function clearStateCookie(isSecure: boolean): string {
  const attrs = [
    `${STATE_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (isSecure) attrs.push('Secure')
  return attrs.join('; ')
}

export function readStateCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';').map(p => p.trim())
  for (const p of parts) {
    if (p.startsWith(`${STATE_COOKIE}=`)) {
      return decodeURIComponent(p.slice(STATE_COOKIE.length + 1))
    }
  }
  return null
}
