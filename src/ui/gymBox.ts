import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { CHALLENGERS, opensTo, statTotal, type Challenger } from '../gym'
import { npcPortraitKey } from '../npc'
import type { RaisingState } from '../raising'
import { CellColor, cellColor, paintCell, type CellBounds } from './cell'
import { withJosa } from './hangul'

/**
 * 체육관에서 누구와 이야기할지 고르는 창.
 *
 * 약한 쪽부터 늘어놓고, 능력치 총합이 모자란 상대는 흐리게 두어
 * 무엇을 더 키워야 다음 문이 열리는지 보이게 합니다.
 */

const BOX = { x: 128, y: 42, width: 704, height: 470 }

const COLUMNS = 2
const CELL = { width: 320, height: 66, gapX: 16, gapY: 10 }
const GRID_LEFT = BOX.x + (BOX.width - (CELL.width * COLUMNS + CELL.gapX * (COLUMNS - 1))) / 2
const GRID_TOP = BOX.y + 84

const ICON = 46
const ROWS = Math.ceil(CHALLENGERS.length / COLUMNS)

const GRID_BOTTOM = GRID_TOP + ROWS * CELL.height + (ROWS - 1) * CELL.gapY
const MESSAGE_Y = GRID_BOTTOM + 20

const QUIT = CHALLENGERS.length
const QUIT_WIDTH = 168
const QUIT_HEIGHT = 36
const QUIT_Y = MESSAGE_Y + 22

export interface GymBoxOptions {
  state: RaisingState
  /** 상대해 주는 포켓몬을 골랐을 때 */
  onPick: (challenger: Challenger) => void
  onCancel: () => void
}

interface Cell {
  frame: Phaser.GameObjects.Graphics
  texts: Phaser.GameObjects.Text[]
  icon?: Phaser.GameObjects.Image
  bounds: CellBounds
  open: boolean
}

export class GymBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly cells: Cell[] = []
  private readonly message: Phaser.GameObjects.Text

  private index = 0
  private lastColumn = 0
  private readonly total: number

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: GymBoxOptions,
  ) {
    this.total = statTotal(options.state.stats)

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
      .text(BOX.x + 32, BOX.y + 22, '체육관', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    const subtitle = scene.add
      .text(BOX.x + 122, BOX.y + 28, '어느 포켓몬과 대화를 할까?', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: CellColor.Detail,
      })
      .setOrigin(0, 0)

    const total = scene.add
      .text(BOX.x + BOX.width - 32, BOX.y + 24, `능력치 총합 ${this.total}`, {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: CellColor.Selected,
      })
      .setOrigin(1, 0)

    this.container.add([shade, box, title, subtitle, total])

    CHALLENGERS.forEach((challenger, i) => this.addCell(challenger, i))
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

    // 상대해 주는 마지막 사람에게 커서를 둡니다. 대개 그쪽에 볼일이 있습니다.
    const last = CHALLENGERS.reduce(
      (best, challenger, i) => (opensTo(challenger, this.total) ? i : best),
      -1,
    )
    this.index = last < 0 ? QUIT : last
    this.lastColumn = this.index === QUIT ? 0 : this.index % COLUMNS

    this.refresh()
  }

  private addCell(challenger: Challenger, i: number): void {
    const x = GRID_LEFT + (i % COLUMNS) * (CELL.width + CELL.gapX)
    const y = GRID_TOP + Math.floor(i / COLUMNS) * (CELL.height + CELL.gapY)
    const bounds = { x, y, width: CELL.width, height: CELL.height }
    const open = opensTo(challenger, this.total)

    const frame = this.scene.add.graphics()

    const textLeft = x + 14 + ICON + 14
    const name = this.label(textLeft, y + 15, challenger.name, '18px', 0)
    const need = this.label(x + CELL.width - 14, y + 17, `총합 ${challenger.need}`, '15px', 1)
    const under = this.label(
      textLeft,
      y + 42,
      open ? challenger.role : '아직 상대해 주지 않는다',
      '15px',
      0,
    )

    const icon = this.scene.add.image(
      x + 14 + ICON / 2,
      y + CELL.height / 2,
      npcPortraitKey(challenger.key),
    )
    icon.setDisplaySize(ICON, ICON)

    this.cells.push({ frame, texts: [name, need, under], icon, bounds, open })
    this.container.add([frame, icon, name, need, under])
    this.makeClickable(bounds, i)
  }

  private addQuitCell(): void {
    const x = BOX.x + (BOX.width - QUIT_WIDTH) / 2
    const bounds = { x, y: QUIT_Y, width: QUIT_WIDTH, height: QUIT_HEIGHT }

    const frame = this.scene.add.graphics()
    const label = this.label(
      x + QUIT_WIDTH / 2,
      QUIT_Y + QUIT_HEIGHT / 2,
      '관둔다',
      '18px',
      0.5,
      0.5,
    )

    this.cells.push({ frame, texts: [label], bounds, open: true })
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
      .text(x, y, value, { fontFamily: FontFamily.Body, fontSize, color: CellColor.Idle })
      .setOrigin(originX, originY)
  }

  /** 좌우는 칸을, 위아래는 줄을 옮깁니다. */
  move(delta: number, axis: 'x' | 'y'): void {
    if (axis === 'x') {
      if (this.index === QUIT) return

      const row = Math.floor(this.index / COLUMNS)
      this.lastColumn = (this.lastColumn + delta + COLUMNS) % COLUMNS
      this.index = Math.min(row * COLUMNS + this.lastColumn, CHALLENGERS.length - 1)
      this.refresh()
      return
    }

    const row = this.index === QUIT ? ROWS : Math.floor(this.index / COLUMNS)
    const next = (row + delta + ROWS + 1) % (ROWS + 1)

    this.index =
      next === ROWS ? QUIT : Math.min(next * COLUMNS + this.lastColumn, CHALLENGERS.length - 1)
    this.refresh()
  }

  submit(): void {
    if (this.index === QUIT) {
      this.cancel()
      return
    }

    const challenger = CHALLENGERS[this.index]
    if (!challenger) return

    if (!opensTo(challenger, this.total)) {
      this.message.setColor('#e8a0a0')
      this.message.setText(
        `능력치 총합이 ${challenger.need - this.total} 만큼 모자랍니다. (지금 ${this.total})`,
      )
      return
    }

    this.options.onPick(challenger)
  }

  cancel(): void {
    this.close()
    this.options.onCancel()
  }

  close(): void {
    this.container.destroy(true)
  }

  private refresh(): void {
    this.cells.forEach((cell, i) => {
      const look = { chosen: i === this.index, dim: !cell.open }

      paintCell(cell.frame, cell.bounds, look)
      const color = cellColor(look)

      cell.texts.forEach((text, n) => {
        // 아래 줄은 고르지 않았을 때 한 단계 죽여 이름이 먼저 읽히게 합니다.
        text.setColor(look.chosen || look.dim ? color : n === 2 ? CellColor.Detail : color)
      })
      // 아직 만나 주지 않는 상대는 얼굴도 흐리게 둡니다.
      cell.icon?.setAlpha(cell.open ? 1 : 0.35)
    })

    const here = CHALLENGERS[this.index]
    this.message.setColor(CellColor.Detail)
    this.message.setText(
      here && !opensTo(here, this.total)
        ? `${withJosa(here.name, '은', '는')} 아직 상대해 주지 않는다. 총합 ${here.need} 부터.`
        : '',
    )
  }
}
