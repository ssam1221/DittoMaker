import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { addChoice } from './panel'

/**
 * 되돌릴 수 없는 동작 앞에 세우는 확인 창입니다.
 *
 * 화면 전체를 덮어 뒤쪽 조작이 새어 들어가지 않게 하고, 처음 선택은
 * 항상 "아니오" 입니다. 실수로 Enter 를 눌러 지워지는 일이 없어야 합니다.
 */

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

export interface ConfirmOptions {
  question: string
  /** 질문 아래 붉게 붙는 한 줄. 생략 가능. */
  warning?: string
  onConfirm: () => void
  onCancel?: () => void
}

export class ConfirmDialog {
  private readonly container: Phaser.GameObjects.Container
  private readonly yes: Phaser.GameObjects.Text
  private readonly no: Phaser.GameObjects.Text
  private confirmed = false

  constructor(scene: Phaser.Scene, private readonly options: ConfirmOptions) {
    const width = 470
    const height = 190

    this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.container.setDepth(100)

    const shade = scene.add.graphics()
    shade.fillStyle(0x000000, 0.66)
    shade.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)

    const box = scene.add.graphics()
    box.fillStyle(0x241f3d, 1)
    box.fillRect(-width / 2, -height / 2, width, height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(-width / 2, -height / 2, width, height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12)

    const question = scene.add
      .text(0, -height / 2 + 32, options.question, {
        fontFamily: FontFamily.Body,
        fontSize: '21px',
        color: '#f6efdc',
        align: 'center',
      })
      .setOrigin(0.5, 0)

    const parts: Phaser.GameObjects.GameObject[] = [shade, box, question]

    if (options.warning) {
      parts.push(
        scene.add
          .text(0, -height / 2 + 72, options.warning, {
            fontFamily: FontFamily.Body,
            fontSize: '17px',
            color: '#ffb4b4',
          })
          .setOrigin(0.5, 0),
      )
    }

    this.yes = addChoice(scene, -80, height / 2 - 46, '예', () => this.finish(true))
    this.no = addChoice(scene, 80, height / 2 - 46, '아니오', () => this.finish(false))

    this.container.add([...parts, this.yes, this.no])
    this.refresh()
  }

  /** 좌우로 예 / 아니오 를 오갑니다. */
  moveSelection(dx: number): void {
    this.confirmed = dx < 0
    this.refresh()
  }

  submit(): void {
    this.finish(this.confirmed)
  }

  cancel(): void {
    this.finish(false)
  }

  private finish(confirmed: boolean): void {
    this.container.destroy(true)

    if (confirmed) {
      this.options.onConfirm()
      return
    }
    this.options.onCancel?.()
  }

  private refresh(): void {
    this.yes.setColor(this.confirmed ? COLOR_SELECTED : COLOR_IDLE)
    this.no.setColor(this.confirmed ? COLOR_IDLE : COLOR_SELECTED)
  }
}

/** 확인 창을 띄우고 손잡이를 돌려줍니다. */
export function askConfirm(scene: Phaser.Scene, options: ConfirmOptions): ConfirmDialog {
  return new ConfirmDialog(scene, options)
}
