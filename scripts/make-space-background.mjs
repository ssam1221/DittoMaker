/**
 * 우주 배경 이미지를 만듭니다.
 *
 *   node scripts/make-space-background.mjs
 *
 * 출력  public/assets/background/space.png  (1920x1080)
 *
 * 외부에서 사진을 받아오지 않고 직접 그립니다. 저작권이 얽히지 않고,
 * 색·별 개수를 고쳐 다시 실행하면 게임 톤에 맞춰 조절할 수 있습니다.
 * 씨앗값이 고정이라 같은 코드는 항상 같은 그림을 만듭니다.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/assets/background/space.png')

const WIDTH = 1920
const HEIGHT = 1080
const SEED = 20260811

/** 재현 가능한 난수 (mulberry32) */
function makeRandom(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = makeRandom(SEED)
const between = (min, max) => min + random() * (max - min)

/** 멀리 퍼진 성운 덩어리 */
function nebula(id, cx, cy, radius, color, opacity) {
  return {
    def: `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
        <stop offset="60%" stop-color="${color}" stop-opacity="${opacity * 0.35}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>`,
    shape: `<ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${radius * between(0.55, 0.85)}" fill="url(#${id})"/>`,
  }
}

const nebulae = [
  nebula('n1', 380, 300, 620, '#5b3fa8', 0.5),
  nebula('n2', 1520, 250, 560, '#2f5fa8', 0.42),
  nebula('n3', 1150, 780, 700, '#7a3f86', 0.32),
  nebula('n4', 620, 900, 480, '#28407d', 0.34),
  nebula('n5', 960, 480, 900, '#3b2a6b', 0.28),
]

// 작은 별들. 밝기와 크기를 흩어 놓아야 평평해 보이지 않습니다.
const stars = []
for (let i = 0; i < 900; i += 1) {
  const x = between(0, WIDTH).toFixed(1)
  const y = between(0, HEIGHT).toFixed(1)
  const r = between(0.4, 1.5).toFixed(2)
  const o = between(0.25, 0.95).toFixed(2)
  stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"/>`)
}

// 눈에 띄는 큰 별 몇 개는 빛무리를 달아 줍니다.
const bright = []
const brightDefs = []
for (let i = 0; i < 18; i += 1) {
  const x = between(60, WIDTH - 60).toFixed(1)
  const y = between(60, HEIGHT - 60).toFixed(1)
  const r = between(1.6, 2.8).toFixed(2)
  const glow = (r * between(5, 9)).toFixed(1)
  const tint = ['#ffffff', '#dbe6ff', '#ffe9c9'][i % 3]

  brightDefs.push(`<radialGradient id="g${i}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${tint}" stop-opacity="0"/>
    </radialGradient>`)
  bright.push(
    `<circle cx="${x}" cy="${y}" r="${glow}" fill="url(#g${i})"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${tint}"/>`,
  )
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#1a1136"/>
      <stop offset="55%" stop-color="#0f0a24"/>
      <stop offset="100%" stop-color="#05030f"/>
    </radialGradient>
    ${nebulae.map((n) => n.def).join('\n')}
    ${brightDefs.join('\n')}
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>
  ${nebulae.map((n) => n.shape).join('\n')}
  ${stars.join('')}
  ${bright.join('')}
</svg>`

await mkdir(dirname(OUT), { recursive: true })
await writeFile(join(ROOT, 'public/assets/background/.gitkeep'), '')

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT)

const { size } = await stat(OUT)
console.log(`생성: ${OUT.replace(ROOT, '.')}  ${WIDTH}x${HEIGHT}  ${(size / 1024).toFixed(0)}KB`)
