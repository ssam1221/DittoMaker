import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'

/**
 * 옛 육성 시뮬레이션 풍의 장식 틀입니다.
 *
 * 양피지 바탕에 금색 이중 테두리를 두르고 네 귀퉁이에 장식을 답니다.
 * 그 안에 색이 있는 안쪽 판을 놓고 질문과 선택지를 올립니다.
 */

export const PARCHMENT = 0xf0e2c8
export const GOLD = 0xb08d3f
export const GOLD_LIGHT = 0xd8bd76

/** 안쪽 판 색 — 단계마다 바꿔 쓰면 화면이 단조롭지 않습니다. */
export const PanelColor = {
  Teal: 0x1f5560,
  Wine: 0x7b2a4a,
  Night: 0x232a4d,
} as const

export interface InnerPanel {
  x: number
  y: number
  width: number
  height: number
}

/** 화면 전체를 덮는 양피지 배경과 바깥 장식 테두리 */
export function drawParchmentFrame(scene: Phaser.Scene): void {
  const g = scene.add.graphics()

  g.fillStyle(PARCHMENT, 1)
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  // 가장자리로 갈수록 어두워지도록 얇은 띠를 여러 겹 깝니다.
  for (let i = 0; i < 12; i += 1) {
    g.fillStyle(0x8a7248, 0.035)
    g.fillRect(i * 2, i * 2, GAME_WIDTH - i * 4, GAME_HEIGHT - i * 4)
  }

  g.lineStyle(3, GOLD, 1)
  g.strokeRect(14, 14, GAME_WIDTH - 28, GAME_HEIGHT - 28)
  g.lineStyle(1, GOLD_LIGHT, 1)
  g.strokeRect(21, 21, GAME_WIDTH - 42, GAME_HEIGHT - 42)

  drawCornerFlourishes(g, 14, 14, GAME_WIDTH - 28, GAME_HEIGHT - 28, 34)
}

/** 질문과 선택지를 담을 안쪽 판 */
export function drawInnerPanel(
  scene: Phaser.Scene,
  panel: InnerPanel,
  color: number = PanelColor.Teal,
): void {
  const g = scene.add.graphics()

  g.fillStyle(0x000000, 0.18)
  g.fillRect(panel.x + 4, panel.y + 5, panel.width, panel.height)

  g.fillStyle(color, 1)
  g.fillRect(panel.x, panel.y, panel.width, panel.height)

  g.lineStyle(3, GOLD, 1)
  g.strokeRect(panel.x, panel.y, panel.width, panel.height)
  g.lineStyle(1, GOLD_LIGHT, 0.85)
  g.strokeRect(panel.x + 6, panel.y + 6, panel.width - 12, panel.height - 12)

  drawCornerFlourishes(g, panel.x, panel.y, panel.width, panel.height, 22)
}

/** 네 귀퉁이에 짧은 갈고리 모양 장식을 그립니다. */
function drawCornerFlourishes(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
): void {
  const corners: ReadonlyArray<readonly [number, number, number, number]> = [
    [x, y, 1, 1],
    [x + width, y, -1, 1],
    [x, y + height, 1, -1],
    [x + width, y + height, -1, -1],
  ]

  g.lineStyle(3, GOLD_LIGHT, 1)
  for (const [cx, cy, sx, sy] of corners) {
    g.beginPath()
    g.moveTo(cx + sx * size, cy)
    g.lineTo(cx + sx * 8, cy)
    g.lineTo(cx + sx * 8, cy + sy * 8)
    g.lineTo(cx, cy + sy * 8)
    g.lineTo(cx, cy + sy * size)
    g.strokePath()
  }
}

/** 판 위쪽 가운데에 놓는 질문 문구 */
export function addPrompt(
  scene: Phaser.Scene,
  panel: InnerPanel,
  text: string,
): Phaser.GameObjects.Text {
  const label = scene.add.text(panel.x + panel.width / 2, panel.y + 30, text, {
    fontFamily: FontFamily.Body,
    fontSize: '24px',
    color: '#f6efdc',
    align: 'center',
  })
  label.setOrigin(0.5, 0)
  return label
}

export interface ChoiceOptions {
  fontSize?: string
  color?: string
  hoverColor?: string
  origin?: [number, number]
  /**
   * 주어지면 마우스를 올렸을 때 이 함수만 부르고 색은 건드리지 않습니다.
   * 키보드 커서와 색을 두고 다투지 않도록, 커서를 쓰는 화면에서는
   * 호출하는 쪽이 색을 도맡습니다.
   */
  onFocus?: () => void
}

/**
 * 마우스로 고를 수 있는 글자 하나를 만듭니다.
 * 자모·숫자·날짜가 전부 같은 방식이라 한 곳에 모아 둡니다.
 */
export function addChoice(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onPick: () => void,
  options: ChoiceOptions = {},
): Phaser.GameObjects.Text {
  const {
    fontSize = '22px',
    color = '#e8dfc4',
    hoverColor = '#ffd447',
    origin = [0.5, 0.5],
    onFocus,
  } = options

  const item = scene.add.text(x, y, text, { fontFamily: FontFamily.Body, fontSize, color })
  item.setOrigin(origin[0], origin[1])
  item.setInteractive({ useHandCursor: true })

  if (onFocus) {
    item.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, onFocus)
  } else {
    item.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => item.setColor(hoverColor))
    item.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => item.setColor(color))
  }

  item.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onPick)

  return item
}
