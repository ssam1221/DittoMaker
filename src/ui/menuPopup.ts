import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { addChoice } from './panel'

/**
 * 화면 가운데 떠서 여러 갈래 중 하나를 고르게 하는 창입니다.
 *
 * 확인 창(confirm)이 예 / 아니오 두 갈래뿐인 것과 달리 항목 수가 자유롭고,
 * 떠 있는 동안 뒤쪽 화면의 조작을 가립니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

export interface MenuItem {
  label: string
  run: () => void
}

export interface MenuPopupOptions {
  title: string
  items: MenuItem[]
  /** Esc 로 닫았을 때 */
  onCancel?: () => void
}

export class MenuPopup {
  private readonly container: Phaser.GameObjects.Container
  private readonly labels: Phaser.GameObjects.Text[] = []
  private index = 0

  constructor(
    scene: Phaser.Scene,
    private readonly options: MenuPopupOptions,
  ) {
    const rowGap = 42
    const width = 320
    const height = 96 + options.items.length * rowGap

    this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.container.setDepth(100)

    const shade = scene.add.graphics()
    shade.fillStyle(0x000000, 0.62)
    shade.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)

    const box = scene.add.graphics()
    box.fillStyle(0x241f3d, 1)
    box.fillRect(-width / 2, -height / 2, width, height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(-width / 2, -height / 2, width, height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12)

    const title = scene.add
      .text(0, -height / 2 + 24, options.title, {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    const divider = scene.add.graphics()
    divider.lineStyle(1, 0xb08d3f, 0.6)
    divider.lineBetween(-width / 2 + 26, -height / 2 + 60, width / 2 - 26, -height / 2 + 60)

    this.container.add([shade, box, title, divider])

    options.items.forEach((item, i) => {
      const label = addChoice(
        scene,
        0,
        -height / 2 + 84 + i * rowGap,
        item.label,
        () => {
          this.index = i
          this.refresh()
          this.pick(i)
        },
        {
          fontSize: '20px',
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

    this.refresh()
  }

  move(delta: number): void {
    const count = this.labels.length
    this.index = (this.index + delta + count) % count
    this.refresh()
  }

  submit(): void {
    this.pick(this.index)
  }

  cancel(): void {
    this.close()
    this.options.onCancel?.()
  }

  close(): void {
    this.container.destroy(true)
  }

  /**
   * 고른 항목을 실행합니다. 창은 먼저 닫습니다 — 항목이 다른 화면으로
   * 넘어가는 경우 닫을 대상이 이미 사라져 있을 수 있기 때문입니다.
   */
  private pick(index: number): void {
    const item = this.options.items[index]
    if (!item) return

    this.close()
    item.run()
  }

  private refresh(): void {
    this.labels.forEach((label, i) => {
      label.setColor(i === this.index ? COLOR_SELECTED : COLOR_IDLE)
    })
  }
}

export function openMenu(scene: Phaser.Scene, options: MenuPopupOptions): MenuPopup {
  return new MenuPopup(scene, options)
}
