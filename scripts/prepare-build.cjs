// Vercel 빌드 전처리: data/races.json → client/public/races.json 복사
const {mkdirSync, copyFileSync, existsSync} = require('fs')
const {resolve} = require('path')

const src = resolve(__dirname, '../data/races.json')
const destDir = resolve(__dirname, '../client/public')
const dest = resolve(destDir, 'races.json')

mkdirSync(destDir, {recursive: true})

if (existsSync(src)) {
  copyFileSync(src, dest)
  console.log('[prepare-build] data/races.json → client/public/races.json 복사 완료')
} else {
  // 최초 배포 시 data/races.json이 비어있어도 빌드는 통과
  const {writeFileSync} = require('fs')
  writeFileSync(dest, JSON.stringify({data: [], count: 0, cachedAt: new Date().toISOString()}, null, 2))
  console.log('[prepare-build] data/races.json 없음 — 빈 파일 생성')
}
