import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { berryIconKey, BERRIES, buyBerry, canAfford, type Berry } from '../items'
import type { RaisingState } from '../raising'

/**
 * 프렌들리숍의 열매 진열대.
 *
 * 옛 육성 시뮬레이션의 행상인 화면처럼, 한 칸이 곧 버튼 하나입니다.
 * 칸 안에 아이콘·이름·값·효과가 함께 들어 있어 목록을 훑지 않고도
 * 무엇을 사는지 한눈에 보입니다. 마지막 칸은 관둔다입니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
/** 살 돈이 모자란 칸은 흐리게 둡니다. */
const COLOR_POOR = '#8d8471'
const COLOR_DETAIL = '#b7aecd'

const BOX = { x: 128, y: 42, width: 704, height: 470 }

const COLUMNS = 2
const CELL = { width: 320, height: 66, gapX: 16, gapY: 10 }
const GRID_LEFT = BOX.x + (BOX.width - (CELL.width * COLUMNS + CELL.gapX * (COLUMNS - 1))) / 2
const GRID_TOP = BOX.y + 84

const ICON = 46
const ROWS = Math.ceil(BERRIES.length / COLUMNS)

/** 격자가 끝나는 자리. 아래에 한마디와 관둔다 칸이 차례로 놓입니다. */
const GRID_BOTTOM = GRID_TOP + ROWS * CELL.height + (ROWS - 1) * CELL.gapY
const MESSAGE_Y = GRID_BOTTOM + 20

/** 관둔다 칸 — 격자 아래에 한 줄로 놓습니다. */
const QUIT = BERRIES.length
const QUIT_WIDTH = 168
const QUIT_HEIGHT = 36
const QUIT_Y = MESSAGE_Y + 22

export interface ShopBoxOptions {
  /** 메타몽의 이름. 먹였을 때의 말에 씁니다. */
  name: string
  state: RaisingState
  /** 산 뒤의 상태를 돌려줍니다. */
  onBuy: (state: RaisingState) => void
  onCancel: () => void
}

/** 칸 하나를 이루는 것들 */
interface Cell {
  frame: Phaser.GameObjects.Graphics
  texts: Phaser.GameObjects.Text[]
  icon?: Phaser.GameObjects.Image
  bounds: { x: number; y: number; width: number; height: number }
}

export class ShopBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly cells: Cell[] = []
  private readonly moneyText: Phaser.GameObjects.Text
  private readonly message: Phaser.GameObjects.Text

  private index = 0
  /** 관둔다에서 격자로 돌아올 때 쓰는 마지막 칸 */
  private lastColumn = 0
  private state: RaisingState

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ShopBoxOptions,
  ) {
    this.state = options.state

    this.container = scene.add.container(0, 0)
    this.container.setDepth(110)

    const shade = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5,
    )
    shade.setInteractive({ useHandCursor: false })

    const box = scene.add.graphics()
    box.fillStyle(0x241f3d, 0.97)
    box.fillRect(BOX.x, BOX.y, BOX.width, BOX.height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(BOX.x, BOX.y, BOX.width, BOX.height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(BOX.x + 5, BOX.y + 5, BOX.width - 10, BOX.height - 10)
    box.lineStyle(1, 0xb08d3f, 0.6)
    box.lineBetween(BOX.x + 24, BOX.y + 66, BOX.x + BOX.width - 24, BOX.y + 66)

    const title = scene.add
      .text(BOX.x + 32, BOX.y + 22, '프렌들리숍', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    const subtitle = scene.add
      .text(BOX.x + 152, BOX.y + 28, '고르면 그 자리에서 한 알 먹입니다.', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: COLOR_DETAIL,
      })
      .setOrigin(0, 0)

    this.moneyText = scene.add
      .text(BOX.x + BOX.width - 32, BOX.y + 24, '', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: COLOR_SELECTED,
      })
      .setOrigin(1, 0)

    this.container.add([shade, box, title, subtitle, this.moneyText])

    BERRIES.forEach((berry, i) => this.addBerryCell(berry, i))
    this.addQuitCell()

    this.message = scene.add
      .text(BOX.x + BOX.width / 2, MESSAGE_Y, '', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#cfe6b0',
        align: 'center',
        wordWrap: { width: BOX.width - 60 },
      })
      .setOrigin(0.5, 0.5)

    this.container.add(this.message)
    this.refresh()
  }

  /** 아이콘·이름·값·효과가 한 칸에 들어간 버튼 */
  private addBerryCell(berry: Berry, i: number): void {
    const x = GRID_LEFT + (i % COLUMNS) * (CELL.width + CELL.gapX)
    const y = GRID_TOP + Math.floor(i / COLUMNS) * (CELL.height + CELL.gapY)
    const bounds = { x, y, width: CELL.width, height: CELL.height }

    const frame = this.scene.add.graphics()

    const textLeft = x + 14 + ICON + 14
    const name = this.label(textLeft, y + 15, berry.name, '18px', 0)
    const price = this.label(
      x + CELL.width - 14,
      y + 17,
      `₽ ${berry.price.toLocaleString()}`,
      '16px',
      1,
    )
    const effect = this.label(textLeft, y + 42, berry.effect, '15px', 0)

    const icon = this.scene.add.image(
      x + 14 + ICON / 2,
      y + CELL.height / 2,
      berryIconKey(berry.key),
    )
    icon.setDisplaySize(ICON, ICON)

    this.cells.push({ frame, texts: [name, price, effect], icon, bounds })
    this.container.add([frame, icon, name, price, effect])
    this.makeClickable(bounds, i)
  }

  private addQuitCell(): void {
    const x = BOX.x + (BOX.width - QUIT_WIDTH) / 2
    const bounds = { x, y: QUIT_Y, width: QUIT_WIDTH, height: QUIT_HEIGHT }

    const frame = this.scene.add.graphics()
    const label = this.label(x + QUIT_WIDTH / 2, QUIT_Y + QUIT_HEIGHT / 2, '관둔다', '18px', 0.5, 0.5)

    this.cells.push({ frame, texts: [label], bounds })
    this.container.add([frame, label])
    this.makeClickable(bounds, QUIT)
  }

  private makeClickable(
    bounds: { x: number; y: number; width: number; height: number },
    index: number,
  ): void {
    const zone = this.scene.add
      .zone(bounds.x, bounds.y, bounds.width, bounds.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.index = index
      if (index !== QUIT) this.lastColumn = index % COLUMNS
      this.refresh()
    })
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.index = index
      this.submit()
    })

    this.container.add(zone)
  }

  private label(
    x: number,
    y: number,
    value: string,
    fontSize: string,
    originX: number,
    originY = 0,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, value, { fontFamily: FontFamily.Body, fontSize, color: COLOR_IDLE })
      .setOrigin(originX, originY)
  }

  /** 좌우는 칸을, 위아래는 줄을 옮깁니다. */
  move(delta: number, axis: 'x' | 'y'): void {
    if (axis === 'x') {
      // 관둔다는 한 줄을 혼자 쓰므로 좌우로 갈 곳이 없습니다.
      if (this.index === QUIT) return

      const row = Math.floor(this.index / COLUMNS)
      this.lastColumn = (this.lastColumn + delta + COLUMNS) % COLUMNS
      this.index = Math.min(row * COLUMNS + this.lastColumn, BERRIES.length - 1)
      this.refresh()
      return
    }

    // 격자 아래에 관둔다가 한 줄 더 있다고 보고 셉니다.
    const row = this.index === QUIT ? ROWS : Math.floor(this.index / COLUMNS)
    const next = (row + delta + ROWS + 1) % (ROWS + 1)

    this.index =
      next === ROWS ? QUIT : Math.min(next * COLUMNS + this.lastColumn, BERRIES.length - 1)
    this.refresh()
  }

  submit(): void {
    if (this.index === QUIT) {
      this.cancel()
      return
    }

    this.buy()
  }

  cancel(): void {
    this.close()
    this.options.onCancel()
  }

  close(): void {
    this.container.destroy(true)
  }

  private buy(): void {
    const berry = BERRIES[this.index]
    if (!berry) return

    if (!canAfford(this.state, berry)) {
      this.say(`돈이 모자랍니다. (₽ ${berry.price.toLocaleString()})`, '#e8a0a0')
      return
    }

    const result = buyBerry(this.state, berry, this.options.name)
    this.state = result.state
    this.options.onBuy(result.state)
    this.say(result.message, '#cfe6b0')
    this.refresh()
  }

  private say(text: string, color: string): void {
    this.message.setColor(color)
    this.message.setText(text)
  }

  private refresh(): void {
    this.moneyText.setText(`₽ ${this.state.money.toLocaleString()}`)

    this.cells.forEach((cell, i) => {
      const chosen = i === this.index
      const berry = BERRIES[i]
      const poor = berry ? !canAfford(this.state, berry) : false

      this.paint(cell, chosen, poor)

      const color = chosen ? COLOR_SELECTED : poor ? COLOR_POOR : COLOR_IDLE
      cell.texts.forEach((text, n) => {
        // 효과 줄은 고르지 않았을 때 한 단계 죽여 이름이 먼저 읽히게 합니다.
        text.setColor(chosen || poor ? color : n === 2 ? COLOR_DETAIL : color)
      })
      cell.icon?.setAlpha(poor && !chosen ? 0.45 : 1)
    })
  }

  private paint(cell: Cell, chosen: boolean, poor: boolean): void {
    const { x, y, width, height } = cell.bounds

    cell.frame.clear()
    cell.frame.fillStyle(chosen ? 0x3b3266 : 0x2e2851, poor && !chosen ? 0.6 : 1)
    cell.frame.fillRect(x, y, width, height)
    cell.frame.lineStyle(chosen ? 2 : 1, chosen ? 0xffd447 : 0x6b5ea8, 1)
    cell.frame.strokeRect(x, y, width, height)
  }
}
