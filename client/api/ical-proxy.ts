// Vercel Edge Function — iCal CORS 프록시
// calendar.google.com 도메인만 허용 (SSRF 방지)

const ALLOWED_HOSTNAMES = new Set(['calendar.google.com'])
const TIMEOUT_MS = 8000

export const config = {runtime: 'edge'}

export default async function handler(request: Request): Promise<Response> {
  const {searchParams} = new URL(request.url)
  const urlParam = searchParams.get('url')

  if (!urlParam) {
    return new Response('url parameter is required', {status: 400})
  }

  let parsed: URL
  try {
    parsed = new URL(urlParam)
  } catch {
    return new Response('invalid url', {status: 400})
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return new Response(`only ${[...ALLOWED_HOSTNAMES].join(', ')} is allowed`, {status: 400})
  }

  // https만 허용
  if (parsed.protocol !== 'https:') {
    return new Response('only https is allowed', {status: 400})
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {'User-Agent': 'TamiyaRaceApp/1.0'},
    })
    clearTimeout(timer)

    if (!upstream.ok) {
      return new Response(`upstream error: ${upstream.status}`, {status: 502})
    }

    const body = await upstream.text()

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return new Response('upstream timeout', {status: 504})
    }
    return new Response('upstream fetch failed', {status: 502})
  }
}
