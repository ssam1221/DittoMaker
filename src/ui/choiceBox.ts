import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { addChoice } from './panel'

/**
 * 갈래가 몇 개뿐일 때 쓰는 작은 선택 창입니다.
 *
 * 일정 창은 달력을 끼고 있어 자리를 크게 차지하므로,
 * 말을 거는 것처럼 짧게 고르고 마는 자리에는 이쪽을 씁니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

export interface ChoiceBoxItem {
  label: string
  /** 아래에 뜨는 한 줄 설명 */
  detail?: string
  run: () => void
}

export interface ChoiceBoxOptions {
  title: string
  items: ChoiceBoxItem[]
  /** 창이 놓일 가운데 좌표. 생략하면 화면 한가운데입니다. */
  x?: number
  y?: number
  onCancel: () => void
}

export class ChoiceBox {
  private readonly container: Phaser.GameObjects.Container
  private readonly labels: Phaser.GameObjects.Text[] = []
  private readonly detail: Phaser.GameObjects.Text
  private index = 0

  constructor(
    scene: Phaser.Scene,
    private readonly options: ChoiceBoxOptions,
  ) {
    const width = 268
    const rowGap = 38
    const height = 96 + options.items.length * rowGap

    const cx = options.x ?? GAME_WIDTH / 2
    const cy = options.y ?? GAME_HEIGHT / 2

    this.container = scene.add.container(cx, cy)
    this.container.setDepth(100)

    const shade = scene.add.graphics()
    shade.fillStyle(0x000000, 0.4)
    shade.fillRect(-cx, -cy, GAME_WIDTH, GAME_HEIGHT)

    const box = scene.add.graphics()
    box.fillStyle(0x241f3d, 0.97)
    box.fillRect(-width / 2, -height / 2, width, height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(-width / 2, -height / 2, width, height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10)

    const title = scene.add
      .text(0, -height / 2 + 16, options.title, {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    const divider = scene.add.graphics()
    divider.lineStyle(1, 0xb08d3f, 0.6)
    divider.lineBetween(-width / 2 + 22, -height / 2 + 44, width / 2 - 22, -height / 2 + 44)

    this.container.add([shade, box, title, divider])

    options.items.forEach((item, i) => {
      const label = addChoice(
        scene,
        0,
        -height / 2 + 66 + i * rowGap,
        item.label,
        () => {
          this.index = i
          this.refresh()
          this.pick(i)
        },
        {
          fontSize: '19px',
          color: COLOR_IDLE,
          onFocus: () => {
            this.index = i
            this.refresh()
          },
        },
      )

      this.labels.push(label)
      this.container.add(label)
    })

    this.detail = scene.add
      .text(0, height / 2 - 24, '', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#b7aecd',
        align: 'center',
        wordWrap: { width: width - 28 },
      })
      .setOrigin(0.5, 0.5)
    this.container.add(this.detail)

    this.refresh()
  }

  move(delta: number): void {
    const count = this.labels.length
    if (count === 0) return

    this.index = (this.index + delta + count) % count
    this.refresh()
  }

  submit(): void {
    this.pick(this.index)
  }

  cancel(): void {
    this.close()
    this.options.onCancel()
  }

  close(): void {
    this.container.destroy(true)
  }

  private pick(index: number): void {
    // 고른 것이 창을 닫거나 갈아끼울 수 있으므로 호출만 넘깁니다.
    this.options.items[index]?.run()
  }

  private refresh(): void {
    this.labels.forEach((label, i) => {
      label.setColor(i === this.index ? COLOR_SELECTED : COLOR_IDLE)
    })
    this.detail.setText(this.options.items[this.index]?.detail ?? '')
  }
}
