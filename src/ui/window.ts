import Phaser from 'phaser'

import type { Season } from '../raising'

/**
 * 방 창문 너머의 풍경을 계절에 맞춰 그립니다.
 *
 * 그림 파일 없이 도형으로만 그리므로, 계절이 바뀌면 같은 자리에 다시
 * 그리기만 하면 됩니다.
 */

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

interface Palette {
  sky: number
  ground: number
  canopy: number
  /** 나뭇잎 없이 가지만 남는 계절인지 */
  bare: boolean
}

const PALETTES: Record<Season, Palette> = {
  spring: { sky: 0xa9d8f0, ground: 0x86c46a, canopy: 0xf3b6cf, bare: false },
  summer: { sky: 0x6fc2ee, ground: 0x5faa4e, canopy: 0x4f9e3f, bare: false },
  autumn: { sky: 0xe8c48a, ground: 0xb08b4f, canopy: 0xd8802f, bare: false },
  winter: { sky: 0xb9c9d8, ground: 0xeef3f7, canopy: 0x8a7a68, bare: true },
}

/** 계절마다 흩뿌리는 알갱이 — 꽃잎, 낙엽, 눈 */
const FLECKS: ReadonlyArray<readonly [number, number]> = [
  [0.18, 0.22],
  [0.42, 0.14],
  [0.68, 0.3],
  [0.29, 0.48],
  [0.78, 0.52],
  [0.55, 0.4],
  [0.12, 0.62],
  [0.86, 0.18],
  [0.36, 0.68],
  [0.62, 0.72],
]

export function drawWindowView(
  g: Phaser.GameObjects.Graphics,
  rect: WindowRect,
  season: Season,
): void {
  g.clear()

  const palette = PALETTES[season]
  const horizon = rect.y + rect.height * 0.62

  g.fillStyle(palette.sky, 1)
  g.fillRect(rect.x, rect.y, rect.width, horizon - rect.y)

  g.fillStyle(palette.ground, 1)
  g.fillRect(rect.x, horizon, rect.width, rect.y + rect.height - horizon)

  // 멀리 보이는 언덕. 창틀 밖으로 나가지 않도록 안쪽에 맞춰 둡니다.
  g.fillStyle(palette.ground, 1)
  g.fillEllipse(rect.x + rect.width * 0.3, horizon, rect.width * 0.52, rect.height * 0.3)
  g.fillEllipse(rect.x + rect.width * 0.72, horizon, rect.width * 0.48, rect.height * 0.24)

  drawSun(g, rect, season)
  drawTree(g, rect, horizon, palette)
  drawFlecks(g, rect, season)
}

function drawSun(g: Phaser.GameObjects.Graphics, rect: WindowRect, season: Season): void {
  const x = rect.x + rect.width * 0.76
  const y = rect.y + rect.height * 0.2

  if (season === 'summer') {
    g.fillStyle(0xfff2a8, 0.55)
    g.fillCircle(x, y, 22)
    g.fillStyle(0xfff07a, 1)
    g.fillCircle(x, y, 13)
    return
  }

  if (season === 'winter') {
    // 겨울 해는 옅게, 구름 뒤에 있는 것처럼
    g.fillStyle(0xffffff, 0.5)
    g.fillCircle(x, y, 11)
    return
  }

  g.fillStyle(0xfff3c0, 0.85)
  g.fillCircle(x, y, 11)
}

function drawTree(
  g: Phaser.GameObjects.Graphics,
  rect: WindowRect,
  horizon: number,
  palette: Palette,
): void {
  const x = rect.x + rect.width * 0.3
  const base = horizon + rect.height * 0.12
  const trunkWidth = Math.max(6, rect.width * 0.045)

  g.fillStyle(0x7a5a3c, 1)
  g.fillRect(x - trunkWidth / 2, base - rect.height * 0.42, trunkWidth, rect.height * 0.42)

  if (palette.bare) {
    // 잎이 진 가지
    g.lineStyle(3, palette.canopy, 1)
    const top = base - rect.height * 0.42
    g.lineBetween(x, top + 8, x - rect.width * 0.11, top - rect.height * 0.08)
    g.lineBetween(x, top + 14, x + rect.width * 0.12, top - rect.height * 0.06)
    g.lineBetween(x, top + 2, x - rect.width * 0.04, top - rect.height * 0.14)
    return
  }

  const canopyY = base - rect.height * 0.46
  g.fillStyle(palette.canopy, 1)
  g.fillCircle(x, canopyY, rect.width * 0.14)
  g.fillCircle(x - rect.width * 0.1, canopyY + rect.height * 0.06, rect.width * 0.1)
  g.fillCircle(x + rect.width * 0.1, canopyY + rect.height * 0.05, rect.width * 0.11)
}

function drawFlecks(g: Phaser.GameObjects.Graphics, rect: WindowRect, season: Season): void {
  if (season === 'summer') return

  const color = season === 'spring' ? 0xffd9e8 : season === 'autumn' ? 0xd8802f : 0xffffff
  const radius = season === 'winter' ? 2.4 : 2

  g.fillStyle(color, 0.95)
  for (const [fx, fy] of FLECKS) {
    g.fillCircle(rect.x + rect.width * fx, rect.y + rect.height * fy, radius)
  }
}
