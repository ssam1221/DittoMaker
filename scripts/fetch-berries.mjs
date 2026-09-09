/**
 * 상점에 놓을 아이템 아이콘을 내려받습니다.
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
  oran: 'oran-berry',
  liechi: 'liechi-berry',
  ganlon: 'ganlon-berry',
  petaya: 'petaya-berry',
  apicot: 'apicot-berry',
  salac: 'salac-berry',
  sitrus: 'sitrus-berry',
  starf: 'starf-berry',

  // 비밀 상인이 파는 것들
  xattack: 'x-attack',
  xdefense: 'x-defense',
  xspatk: 'x-sp-atk',
  xspdef: 'x-sp-def',
  xspeed: 'x-speed',
  xaccuracy: 'x-accuracy',
  direhit: 'dire-hit',
  firestone: 'fire-stone',
  waterstone: 'water-stone',
  thunderstone: 'thunder-stone',
  leafstone: 'leaf-stone',
  moonstone: 'moon-stone',
  slowpoketail: 'slowpoke-tail',
  // 풍유환은 포켓몬에 없는 물건이라, 둥글고 향이 날 것 같은 향로를 빌려 씁니다.
  fullincense: 'full-incense',
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

console.log(`\n아이템 아이콘 ${Object.keys(BERRIES).length - failures.length}개`)
if (failures.length) {
  console.log('실패:')
  for (const f of failures) console.log(`  ${f}`)
  process.exitCode = 1
}
