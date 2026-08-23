/**
 * 프렌들리숍에 놓을 열매 아이콘을 내려받습니다.
 *
 *   node scripts/fetch-berries.mjs
 *
 * 출력  public/assets/items/<key>.png
 *
 * 원본은 PokeAPI 의 아이템 스프라이트라 30x30 안팎입니다. 그대로 두면
 * 상점 칸에서 흐리게 늘어나므로, 픽셀을 살려 네 배로 키워 둡니다.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/assets/items')
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items'

/** 게임에서 쓰는 이름 → 원본 파일 이름 */
const BERRIES = {
  pomeg: 'pomeg-berry',
  kelpsy: 'kelpsy-berry',
  qualot: 'qualot-berry',
  hondew: 'hondew-berry',
  grepa: 'grepa-berry',
  tamato: 'tamato-berry',
  oran: 'oran-berry',
  lum: 'lum-berry',
}

const SCALE = 4

await mkdir(OUT_DIR, { recursive: true })

const failures = []
for (const [key, file] of Object.entries(BERRIES)) {
  try {
    const response = await fetch(`${BASE}/${file}.png`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const source = Buffer.from(await response.arrayBuffer())
    const { width, height } = await sharp(source).metadata()

    const grown = await sharp(source)
      .resize(width * SCALE, height * SCALE, { kernel: 'nearest' })
      .png({ compressionLevel: 9 })
      .toBuffer()

    await writeFile(join(OUT_DIR, `${key}.png`), grown)
    console.log(`  ${key}  ${width}x${height} -> ${width * SCALE}x${height * SCALE}`)
  } catch (error) {
    failures.push(`${key}: ${error.message}`)
  }
}

console.log(`\n열매 아이콘 ${Object.keys(BERRIES).length - failures.length}개`)
if (failures.length) {
  console.log('실패:')
  for (const f of failures) console.log(`  ${f}`)
  process.exitCode = 1
}
