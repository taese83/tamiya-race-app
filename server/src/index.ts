import express from 'express'
import cors from 'cors'
import {crawlRaces, crawlRaceDetail, clearCache} from './crawler.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({origin: ['http://localhost:5173', 'http://127.0.0.1:5173']}))
app.use(express.json())

// 대회 목록 조회
app.get('/api/races', async (_req, res) => {
  try {
    const races = await crawlRaces()
    res.json({ok: true, data: races, count: races.length, cachedAt: new Date().toISOString()})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[crawl error]', message)
    res.status(502).json({ok: false, error: '크롤링에 실패했습니다.', detail: message})
  }
})

// 대회 상세 조회 (참가비·접수기한·접수방법·접수URL)
app.get('/api/races/:wrId/detail', async (req, res) => {
  const {wrId} = req.params
  if (!wrId || !/^\d+$/.test(wrId)) {
    res.status(400).json({ok: false, error: '유효하지 않은 wrId입니다.'})
    return
  }
  try {
    const detail = await crawlRaceDetail(wrId)
    res.json({ok: true, data: detail})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[detail crawl error]', wrId, message)
    res.status(502).json({ok: false, error: '상세 정보 크롤링에 실패했습니다.', detail: message})
  }
})

// 캐시 초기화 (재크롤링)
app.post('/api/races/refresh', async (_req, res) => {
  clearCache()
  try {
    const races = await crawlRaces()
    res.json({ok: true, data: races, count: races.length})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.status(502).json({ok: false, error: '크롤링에 실패했습니다.', detail: message})
  }
})

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use.`)
    console.error(`[server] Run: lsof -ti:${PORT} | xargs kill -9`)
    process.exit(1)
  }
  throw err
})
