import Phaser from 'phaser'

/**
 * 상점·접수대·체육관이 함께 쓰는 네모 칸.
 *
 * 셋 다 같은 모양의 버튼을 늘어놓으므로 그리는 일만 여기에 모읍니다.
 */

export const CellColor = {
  Idle: '#e8dfc4',
  Selected: '#ffd447',
  /** 고를 수 없는 칸 */
  Dim: '#8d8471',
  Detail: '#b7aecd',
} as const

export interface CellBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CellLook {
  chosen: boolean
  /** 지금은 고를 수 없는 칸 */
  dim?: boolean
}

export function paintCell(
  graphics: Phaser.GameObjects.Graphics,
  bounds: CellBounds,
  look: CellLook,
): void {
  const { x, y, width, height } = bounds
  const faded = Boolean(look.dim) && !look.chosen

  graphics.clear()
  graphics.fillStyle(look.chosen ? 0x3b3266 : 0x2e2851, faded ? 0.6 : 1)
  graphics.fillRect(x, y, width, height)
  graphics.lineStyle(look.chosen ? 2 : 1, look.chosen ? 0xffd447 : 0x6b5ea8, 1)
  graphics.strokeRect(x, y, width, height)
}

/** 칸 안 글자의 색 */
export function cellColor(look: CellLook): string {
  if (look.chosen) return CellColor.Selected
  return look.dim ? CellColor.Dim : CellColor.Idle
}
