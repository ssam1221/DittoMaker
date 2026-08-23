import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { BERRIES, buyBerry, canAfford, type Berry } from '../items'
import type { RaisingState } from '../raising'

/**
 * 프렌들리숍의 열매 진열대.
 *
 * 마을 그림 위에 덮어 놓고 고르게 합니다. 한 번 고를 때마다 한 알씩
 * 사서 그 자리에서 먹이므로, 돈이 닿는 한 계속 눌러도 됩니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
/** 살 돈이 모자란 줄은 흐리게 둡니다. */
const COLOR_POOR = '#8d8471'

const BOX = { x: 232, y: 46, width: 496, height: 448 }
const ROW_TOP = BOX.y + 92
const ROW_GAP = 34

const COL_NAME = BOX.x + 36
const COL_EFFECT = BOX.x + 186
const COL_PRICE = BOX.x + BOX.width - 36

export interface ShopBoxOptions {
  /** 메타몽의 이름. 먹였을 때의 말에 씁니다. */
  name: string
  state: RaisingState
  /** 산 뒤의 상태를 돌려줍니다. */
  onBuy: (state: RaisingState) => void
  onCancel: () => void
}

export class ShopBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly rows: Phaser.GameObjects.Text[][] = []
  private readonly markers: Phaser.GameObjects.Text[] = []
  private readonly moneyText: Phaser.GameObjects.Text
  private readonly message: Phaser.GameObjects.Text

  private index = 0
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
    box.lineBetween(BOX.x + 24, BOX.y + 74, BOX.x + BOX.width - 24, BOX.y + 74)

    const title = scene.add
      .text(COL_NAME, BOX.y + 26, '프렌들리숍', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    this.moneyText = scene.add
      .text(COL_PRICE, BOX.y + 30, '', {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: '#ffd447',
      })
      .setOrigin(1, 0)

    const subtitle = scene.add
      .text(COL_NAME, BOX.y + 52, '고르면 그 자리에서 한 알 먹입니다.', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: '#b7aecd',
      })
      .setOrigin(0, 0)

    this.container.add([shade, box, title, this.moneyText, subtitle])

    BERRIES.forEach((berry, i) => this.addRow(berry, i))

    this.message = scene.add
      .text(BOX.x + BOX.width / 2, BOX.y + BOX.height - 54, '', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#cfe6b0',
        align: 'center',
        wordWrap: { width: BOX.width - 60 },
      })
      .setOrigin(0.5, 0.5)

    const hint = scene.add
      .text(BOX.x + BOX.width / 2, BOX.y + BOX.height - 24, 'Enter 사기    Esc 나가기', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: '#b7aecd',
      })
      .setOrigin(0.5, 0.5)

    this.container.add([this.message, hint])
    this.refresh()
  }

  private addRow(berry: Berry, i: number): void {
    const y = ROW_TOP + i * ROW_GAP

    const marker = this.scene.add
      .text(COL_NAME - 18, y, '▶', {
        fontFamily: FontFamily.Body,
        fontSize: '13px',
        color: COLOR_SELECTED,
      })
      .setOrigin(0.5, 0.5)
    this.markers.push(marker)

    const name = this.text(COL_NAME, y, berry.name, '18px', 0)
    const effect = this.text(COL_EFFECT, y, berry.effect, '16px', 0)
    const price = this.text(COL_PRICE, y, `₽ ${berry.price.toLocaleString()}`, '16px', 1)
    this.rows.push([name, effect, price])

    // 글자마다 판정을 걸면 사이 틈이 죽으므로 줄 전체를 덮는 판을 둡니다.
    const hit = this.scene.add
      .zone(BOX.x + 16, y - ROW_GAP / 2, BOX.width - 32, ROW_GAP)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.index = i
      this.refresh()
    })
    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.index = i
      this.buy()
    })

    this.container.add([marker, name, effect, price, hit])
  }

  private text(
    x: number,
    y: number,
    value: string,
    fontSize: string,
    originX: number,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, value, { fontFamily: FontFamily.Body, fontSize, color: COLOR_IDLE })
      .setOrigin(originX, 0.5)
  }

  move(delta: number): void {
    this.index = (this.index + delta + BERRIES.length) % BERRIES.length
    this.refresh()
  }

  submit(): void {
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

    BERRIES.forEach((berry, i) => {
      const chosen = i === this.index
      const color = chosen ? COLOR_SELECTED : canAfford(this.state, berry) ? COLOR_IDLE : COLOR_POOR

      this.markers[i]?.setVisible(chosen)
      this.rows[i]?.forEach((part) => part.setColor(color))
    })
  }
}
