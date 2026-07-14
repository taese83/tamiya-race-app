// Vercel 빌드 전처리: data/races.json → {cwd}/public/races.json 복사
// Vercel Root Directory = client/ 이면 process.cwd() = /vercel/path/client
// 로컬 실행(루트에서): process.cwd() = 프로젝트 루트
const {mkdirSync, copyFileSync, existsSync, writeFileSync} = require('fs')
const {resolve} = require('path')

const cwd = process.cwd()
const destDir = resolve(cwd, 'public')
const dest = resolve(destDir, 'races.json')

// data/races.json 위치 탐색: cwd/data → cwd/../data 순서
const candidates = [
  resolve(cwd, 'data/races.json'),
  resolve(cwd, '../data/races.json'),
]
const src = candidates.find(p => existsSync(p)) ?? null

mkdirSync(destDir, {recursive: true})

if (src) {
  copyFileSync(src, dest)
  console.log(`[prepare-build] ${src} → ${dest}`)
} else {
  writeFileSync(dest, JSON.stringify({data: [], details: {}, count: 0, cachedAt: new Date().toISOString()}, null, 2))
  console.log(`[prepare-build] data/races.json 없음 → ${dest} 에 빈 파일 생성`)
}
