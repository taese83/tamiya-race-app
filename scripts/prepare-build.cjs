// Vercel 빌드 전처리: data/races.json + data/races-active.json → {cwd}/public/ 복사
// Vercel Root Directory = client/ 이면 process.cwd() = /vercel/path/client
// 로컬 실행(루트에서): process.cwd() = 프로젝트 루트
const {mkdirSync, copyFileSync, existsSync, writeFileSync} = require('fs')
const {resolve, dirname} = require('path')

const cwd = process.cwd()
const destDir = resolve(cwd, 'public')

mkdirSync(destDir, {recursive: true})

function findSource(filename) {
  const candidates = [
    resolve(cwd, 'data', filename),
    resolve(cwd, '../data', filename),
  ]
  return candidates.find(p => existsSync(p)) ?? null
}

function copyOrStub(filename) {
  const src = findSource(filename)
  const dest = resolve(destDir, filename)
  if (src) {
    copyFileSync(src, dest)
    console.log(`[prepare-build] ${src} → ${dest}`)
  } else {
    writeFileSync(dest, JSON.stringify({data: [], details: {}, count: 0, cachedAt: new Date().toISOString()}, null, 2))
    console.log(`[prepare-build] ${filename} 없음 → ${dest} 에 빈 파일 생성`)
  }
}

copyOrStub('races.json')
copyOrStub('races-active.json')
