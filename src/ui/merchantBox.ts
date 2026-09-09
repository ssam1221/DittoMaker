import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { canAfford, buyGoods, GOODS, goodsIconKey, type Goods } from '../merchant'
import type { RaisingState } from '../raising'
import { CellColor, cellColor, paintCell, type CellBounds } from './cell'

/**
 * 비밀 상인이 펼쳐 놓은 좌판.
 *
 * 파는 것이 열넷이라 프렌들리숍보다 칸을 잘게 나눠 세 줄로 놓습니다.
 * 열넷에 관둔다를 더하면 꼭 세 칸씩 다섯 줄이 되어 자리가 남지 않습니다.
 */

const BOX = { x: 110, y: 28, width: 740, height: 484 }

const COLUMNS = 3
const CELL = { width: 232, height: 62, gapX: 14, gapY: 8 }
const GRID_LEFT = BOX.x + (BOX.width - (CELL.width * COLUMNS + CELL.gapX * (COLUMNS - 1))) / 2
const GRID_TOP = BOX.y + 78

const ICON = 40
const ROWS = Math.ceil((GOODS.length + 1) / COLUMNS)

/** 관둔다는 마지막 칸을 그대로 씁니다. */
const QUIT = GOODS.length

const GRID_BOTTOM = GRID_TOP + ROWS * CELL.height + (ROWS - 1) * CELL.gapY
const MESSAGE_Y = GRID_BOTTOM + 22

export interface MerchantBoxOptions {
  name: string
  state: RaisingState
  onBuy: (state: RaisingState) => void
  onCancel: () => void
}

interface Cell {
  frame: Phaser.GameObjects.Graphics
  texts: Phaser.GameObjects.Text[]
  icon?: Phaser.GameObjects.Image
  bounds: CellBounds
}

export class MerchantBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly cells: Cell[] = []
  private readonly moneyText: Phaser.GameObjects.Text
  private readonly message: Phaser.GameObjects.Text

  private index = 0
  private state: RaisingState

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: MerchantBoxOptions,
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
      0.55,
    )
    shade.setInteractive({ useHandCursor: false })

    const box = scene.add.graphics()
    box.fillStyle(0x1e1a33, 0.97)
    box.fillRect(BOX.x, BOX.y, BOX.width, BOX.height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(BOX.x, BOX.y, BOX.width, BOX.height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(BOX.x + 5, BOX.y + 5, BOX.width - 10, BOX.height - 10)
    box.lineStyle(1, 0xb08d3f, 0.6)
    box.lineBetween(BOX.x + 24, BOX.y + 62, BOX.x + BOX.width - 24, BOX.y + 62)

    const title = scene.add
      .text(BOX.x + 30, BOX.y + 20, '수상한 좌판', {
        fontFamily: FontFamily.Body,
        fontSize: '21px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    const subtitle = scene.add
      .text(BOX.x + 152, BOX.y + 26, '어디서도 안 파는 것들이라네.', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: CellColor.Detail,
      })
      .setOrigin(0, 0)

    this.moneyText = scene.add
      .text(BOX.x + BOX.width - 30, BOX.y + 22, '', {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: CellColor.Selected,
      })
      .setOrigin(1, 0)

    this.container.add([shade, box, title, subtitle, this.moneyText])

    GOODS.forEach((goods, i) => this.addGoodsCell(goods, i))
    this.addQuitCell()

    this.message = scene.add
      .text(BOX.x + BOX.width / 2, MESSAGE_Y, '', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: CellColor.Detail,
        align: 'center',
        wordWrap: { width: BOX.width - 60 },
      })
      .setOrigin(0.5, 0.5)

    this.container.add(this.message)
    this.refresh()
  }

  private cellBounds(i: number): CellBounds {
    return {
      x: GRID_LEFT + (i % COLUMNS) * (CELL.width + CELL.gapX),
      y: GRID_TOP + Math.floor(i / COLUMNS) * (CELL.height + CELL.gapY),
      width: CELL.width,
      height: CELL.height,
    }
  }

  private addGoodsCell(goods: Goods, i: number): void {
    const bounds = this.cellBounds(i)
    const { x, y } = bounds

    const frame = this.scene.add.graphics()

    const textLeft = x + 10 + ICON + 10
    const name = this.label(textLeft, y + 12, goods.name, '17px', 0)
    const price = this.label(
      x + CELL.width - 12,
      y + 15,
      `₽ ${goods.price.toLocaleString()}`,
      '13px',
      1,
    )
    const effect = this.label(textLeft, y + 37, goods.effect, '14px', 0)

    const icon = this.scene.add.image(x + 10 + ICON / 2, y + CELL.height / 2, goodsIconKey(goods.key))
    icon.setDisplaySize(ICON, ICON)

    this.cells.push({ frame, texts: [name, price, effect], icon, bounds })
    this.container.add([frame, icon, name, price, effect])
    this.makeClickable(bounds, i)
  }

  private addQuitCell(): void {
    const bounds = this.cellBounds(QUIT)
    const label = this.label(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      '관둔다',
      '18px',
      0.5,
      0.5,
    )

    const frame = this.scene.add.graphics()
    this.cells.push({ frame, texts: [label], bounds })
    this.container.add([frame, label])
    this.makeClickable(bounds, QUIT)
  }

  private makeClickable(bounds: CellBounds, index: number): void {
    const zone = this.scene.add
      .zone(bounds.x, bounds.y, bounds.width, bounds.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.index = index
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
      .text(x, y, value, { fontFamily: FontFamily.Body, fontSize, color: CellColor.Idle })
      .setOrigin(originX, originY)
  }

  /** 좌판은 빈틈 없는 세 칸짜리 격자라 어느 쪽으로든 돌기만 하면 됩니다. */
  move(delta: number, axis: 'x' | 'y'): void {
    const count = this.cells.length
    const step = axis === 'x' ? delta : delta * COLUMNS

    this.index = (this.index + step + count) % count
    this.refresh()
  }

  submit(): void {
    if (this.index === QUIT) {
      this.cancel()
      return
    }

    const goods = GOODS[this.index]
    if (!goods) return

    if (!canAfford(this.state, goods)) {
      this.say(`「그 값은 못 치르겠구먼.」  (₽ ${goods.price.toLocaleString()})`, '#e8a0a0')
      return
    }

    const result = buyGoods(this.state, goods, this.options.name)
    this.state = result.state
    this.options.onBuy(result.state)
    this.say(`「${goods.patter}」  ${result.message}`, '#cfe6b0')
    this.refresh()
  }

  cancel(): void {
    this.close()
    this.options.onCancel()
  }

  close(): void {
    this.container.destroy(true)
  }

  private say(text: string, color: string): void {
    this.message.setColor(color)
    this.message.setText(text)
  }

  private refresh(): void {
    this.moneyText.setText(`₽ ${this.state.money.toLocaleString()}`)

    this.cells.forEach((cell, i) => {
      const goods = GOODS[i]
      const look = { chosen: i === this.index, dim: goods ? !canAfford(this.state, goods) : false }

      paintCell(cell.frame, cell.bounds, look)

      const color = cellColor(look)
      cell.texts.forEach((text, n) => {
        // 효과 줄은 고르지 않았을 때 한 단계 죽여 이름이 먼저 읽히게 합니다.
        text.setColor(look.chosen || look.dim ? color : n === 2 ? CellColor.Detail : color)
      })
      cell.icon?.setAlpha(look.dim && !look.chosen ? 0.4 : 1)
    })
  }
}
