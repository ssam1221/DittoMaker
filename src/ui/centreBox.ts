import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { centreCost, centreOpen, centreRest, type RaisingState } from '../raising'
import { withJosa } from './hangul'

/**
 * 포켓몬센터의 접수대.
 *
 * 쌓인 스트레스의 절반을 덜어 주고, 값은 그 스트레스의 스물다섯 배를
 * 받습니다. 지쳐 있을수록 비싸지므로 언제 들르는지가 곧 선택이 됩니다.
 * 한 달에 한 번뿐이라, 이미 다녀왔으면 안내만 하고 물러납니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
const COLOR_POOR = '#8d8471'

const BOX = { x: 268, y: 148, width: 424, height: 250 }

const CELL = { width: 176, height: 44, gap: 20 }
const CELL_Y = BOX.y + BOX.height - 76

export interface CentreBoxOptions {
  name: string
  state: RaisingState
  onRest: (state: RaisingState) => void
  onClose: () => void
}

interface Cell {
  frame: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
  bounds: { x: number; y: number; width: number; height: number }
  enabled: boolean
}

export class CentreBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly cells: Cell[] = []
  private readonly message: Phaser.GameObjects.Text

  private index = 0
  private state: RaisingState
  private done = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: CentreBoxOptions,
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
    box.lineBetween(BOX.x + 24, BOX.y + 58, BOX.x + BOX.width - 24, BOX.y + 58)

    const title = scene.add
      .text(BOX.x + BOX.width / 2, BOX.y + 22, '포켓몬센터', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    const money = scene.add
      .text(BOX.x + BOX.width - 26, BOX.y + 26, `₽ ${this.state.money.toLocaleString()}`, {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: COLOR_SELECTED,
      })
      .setOrigin(1, 0)

    this.message = scene.add
      .text(BOX.x + BOX.width / 2, BOX.y + 102, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: COLOR_IDLE,
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: BOX.width - 56 },
      })
      .setOrigin(0.5, 0.5)

    this.container.add([shade, box, title, money, this.message])

    const restable = centreOpen(this.state) && this.state.stress > 0
    this.addCell(0, '쉬어 간다', restable)
    this.addCell(1, '관둔다', true)

    // 쉴 수 없는 날이면 처음부터 관둔다에 커서를 둡니다.
    this.index = restable ? 0 : 1
    this.say(this.opening())
    this.refresh()
  }

  private addCell(i: number, text: string, enabled: boolean): void {
    const total = CELL.width * 2 + CELL.gap
    const x = BOX.x + (BOX.width - total) / 2 + i * (CELL.width + CELL.gap)
    const bounds = { x, y: CELL_Y, width: CELL.width, height: CELL.height }

    const frame = this.scene.add.graphics()
    const label = this.scene.add
      .text(x + CELL.width / 2, CELL_Y + CELL.height / 2, text, {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: COLOR_IDLE,
      })
      .setOrigin(0.5, 0.5)

    const zone = this.scene.add
      .zone(x, CELL_Y, CELL.width, CELL.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.index = i
      this.refresh()
    })
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.index = i
      this.submit()
    })

    this.cells.push({ frame, label, bounds, enabled })
    this.container.add([frame, label, zone])
  }

  /** 들어섰을 때의 안내 */
  private opening(): string {
    if (!centreOpen(this.state)) {
      return '이번 달은 이미 다녀갔습니다.\n다음 달에 다시 오세요.'
    }
    if (this.state.stress === 0) {
      return `${withJosa(this.options.name, '은', '는')} 아주 편안해 보입니다.\n오늘은 쉬어 갈 것이 없네요.`
    }

    const cost = centreCost(this.state)
    return `스트레스 ${this.state.stress} → ${Math.floor(this.state.stress / 2)}\n₽ ${cost.toLocaleString()} 을 받습니다.`
  }

  move(delta: number): void {
    if (this.done) return

    this.index = (this.index + delta + this.cells.length) % this.cells.length
    this.refresh()
  }

  submit(): void {
    if (this.done || this.index === 1) {
      this.cancel()
      return
    }

    this.rest()
  }

  cancel(): void {
    this.close()
    this.options.onClose()
  }

  close(): void {
    this.container.destroy(true)
  }

  private rest(): void {
    if (!centreOpen(this.state) || this.state.stress === 0) return

    const cost = centreCost(this.state)
    if (this.state.money < cost) {
      this.say(`돈이 모자랍니다.\n₽ ${cost.toLocaleString()} 이 필요합니다.`, '#e8a0a0')
      return
    }

    const before = this.state.stress
    this.state = centreRest(this.state)
    this.options.onRest(this.state)

    // 한 달에 한 번뿐이니 쉬고 나면 남는 것은 나가는 일뿐입니다.
    this.done = true
    this.index = 1
    this.cells[0]!.enabled = false

    this.say(
      `${withJosa(this.options.name, '이', '가')} 푹 쉬었습니다.\n스트레스 ${before} → ${this.state.stress}`,
      '#cfe6b0',
    )
    this.refresh()
  }

  private say(text: string, color: string = COLOR_IDLE): void {
    this.message.setColor(color)
    this.message.setText(text)
  }

  private refresh(): void {
    this.cells.forEach((cell, i) => {
      const chosen = i === this.index
      const dim = !cell.enabled

      cell.frame.clear()
      cell.frame.fillStyle(chosen ? 0x3b3266 : 0x2e2851, dim && !chosen ? 0.6 : 1)
      cell.frame.fillRect(cell.bounds.x, cell.bounds.y, cell.bounds.width, cell.bounds.height)
      cell.frame.lineStyle(chosen ? 2 : 1, chosen ? 0xffd447 : 0x6b5ea8, 1)
      cell.frame.strokeRect(cell.bounds.x, cell.bounds.y, cell.bounds.width, cell.bounds.height)

      cell.label.setColor(chosen ? COLOR_SELECTED : dim ? COLOR_POOR : COLOR_IDLE)
    })
  }
}
