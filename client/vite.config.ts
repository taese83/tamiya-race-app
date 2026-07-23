import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath, URL} from 'node:url'
import {existsSync, readdirSync} from 'node:fs'
import type {IncomingMessage, ServerResponse} from 'node:http'

/**
 * Vite dev server에 /api/* 라우팅을 추가한다.
 * production은 Vercel serverless가 client/api/*.ts를 직접 실행.
 * 로컬 dev는 이 middleware가 같은 파일을 즉시 import해 handler 호출.
 * 이렇게 하면 별도 vercel dev 없이 pnpm dev만으로 전체 개발이 가능하다.
 */
/** api/*.ts는 상대 import를 '.js'로 쓰지만 로컬 dev에서는 실제 파일이 .ts.
 *  Vite의 SSR module loader를 통해 resolve/transpile하도록 한다. */
async function invokeApiHandler(
  filePath: string,
  params: Record<string, string>,
  req: IncomingMessage,
  res: ServerResponse,
  loader: (path: string) => Promise<Record<string, unknown>>,
) {
  try {
    const mod = await loader(filePath)
    const handler = mod.default
    if (typeof handler !== 'function') {
      res.statusCode = 500
      res.end(`API handler ${filePath} has no default export`)
      return
    }

    // Vercel handler와 유사한 shape 제공
    const url = new URL(req.url ?? '/', 'http://localhost')
    const query: Record<string, string | string[]> = {...params}
    url.searchParams.forEach((v, k) => {
      const existing = query[k]
      if (existing == null) query[k] = v
      else if (Array.isArray(existing)) existing.push(v)
      else query[k] = [existing, v]
    })
    ;(req as unknown as {query: typeof query}).query = query
    ;(res as unknown as {status: (n: number) => ServerResponse}).status = (code: number) => {
      res.statusCode = code
      return res
    }
    ;(res as unknown as {json: (body: unknown) => void}).json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    }
    ;(res as unknown as {send: (body: string) => void}).send = (body: string) => {
      res.end(body)
    }
    ;(res as unknown as {redirect: (code: number, location: string) => void}).redirect = (code: number, location: string) => {
      res.statusCode = code
      res.setHeader('Location', location)
      res.end()
    }

    await handler(req, res)
  } catch (err) {
    console.error(`[api] ${filePath} 실행 실패:`, err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({error: err instanceof Error ? err.message : 'unknown error'}))
    } else {
      res.end()
    }
  }
}

/** URL path → api/*.ts 파일 경로 매핑. dynamic [param] 세그먼트 지원. */
function resolveApiFile(pathname: string): {filePath: string; params: Record<string, string>} | null {
  if (!pathname.startsWith('/api/')) return null
  const rel = pathname.slice('/api/'.length)
  if (!rel || rel.includes('..')) return null
  const apiDir = fileURLToPath(new URL('api', import.meta.url))

  const segments = rel.split('/').filter(Boolean)
  if (segments.length === 0) return null

  // 정확 매치 우선: /api/participations/xxx → api/participations/xxx.ts
  const exactFile = `${apiDir}/${segments.join('/')}.ts`
  if (existsSync(exactFile)) return {filePath: exactFile, params: {}}
  // /api/participations → api/participations/index.ts
  const indexFile = `${apiDir}/${segments.join('/')}/index.ts`
  if (existsSync(indexFile)) return {filePath: indexFile, params: {}}

  // dynamic 세그먼트: 마지막 segment를 [param]으로 시도
  // /api/participations/xxx → api/participations/[raceId].ts
  const parentSegs = segments.slice(0, -1)
  const lastSeg = segments[segments.length - 1]!
  const parentDir = `${apiDir}${parentSegs.length > 0 ? '/' + parentSegs.join('/') : ''}`
  if (existsSync(parentDir)) {
    const entries = readdirSync(parentDir)
    for (const e of entries) {
      const m = e.match(/^\[([^\]]+)\]\.ts$/)
      if (m) {
        return {filePath: `${parentDir}/${e}`, params: {[m[1]!]: decodeURIComponent(lastSeg)}}
      }
    }
  }
  return null
}

export default defineConfig(({mode}) => {
  // .env.local 등을 명시적으로 process.env에 주입 (전체 키, VITE_ prefix 없이도)
  const envDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, envDir, '')
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] == null) process.env[k] = v
  }
  // dev 진입 시 어떤 env가 잡혔는지 한 번 로그 (값은 masking)
  const seen = ['GOOGLE_CLIENT_ID', 'GOOGLE_REDIRECT_URI', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'DATABASE_URL']
  const summary = seen.map(k => `${k}=${process.env[k] ? `set(${process.env[k]!.slice(0, 8)}…)` : 'MISSING'}`).join(' ')
  console.log(`[vite env] dir=${envDir}\n[vite env] ${summary}`)

  return {
    plugins: [
      react(),
      {
        name: 'local-api-middleware',
        configureServer(server) {
          // Vite의 SSR loader가 .js → .ts 자동 리졸브 + TS transpile 처리
          const loader = (path: string) => server.ssrLoadModule(path)
          server.middlewares.use(async (req, res, next) => {
            const url = req.url ?? ''
            const pathname = url.split('?')[0] ?? ''
            const match = resolveApiFile(pathname)
            if (!match) { next(); return }
            await invokeApiHandler(match.filePath, match.params, req, res, loader)
          })
        },
      },
    ],
    resolve: {
      alias: {'@': fileURLToPath(new URL('src', import.meta.url))},
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
  }
})
