import Phaser from 'phaser'

import { playSfx } from '../audio/sfx'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import { npcArtKey, npcCryKey, npcPortraitKey, type Greeting } from '../npc'
import { createPokemonFrame } from './pokemonFrame'

/**
 * 일정을 확정했을 때 담당 포켓몬이 나와 한마디를 건네는 창입니다.
 *
 * 아르세우스 장면과 같은 모양 — 얼굴을 왼쪽에 두고 오른쪽에 말을
 * 한 글자씩 찍습니다. 다른 점은 씬을 옮기지 않고 육성 화면 위에
 * 덮어씌운다는 것뿐입니다. 한 달 치를 차례로 보여 주고 마지막에
 * onDone 을 부릅니다.
 */

/** 대화창 자리 — 아르세우스 장면과 같은 치수 */
const BOX = {
  x: 24,
  y: 336,
  width: GAME_WIDTH - 48,
  height: GAME_HEIGHT - 336 - 24,
}

const PORTRAIT_SIZE = 104
const PORTRAIT_X = BOX.x + 18 + PORTRAIT_SIZE / 2
const PORTRAIT_Y = BOX.y + 12 + PORTRAIT_SIZE / 2
const TEXT_LEFT = BOX.x + PORTRAIT_SIZE + 44

/** 그림이 서 있는 바닥 — 대화창 바로 위 */
const ART_BOTTOM = BOX.y - 12
/** 화면 위쪽에 남기는 여백을 뺀 높이 */
const ART_MAX_HEIGHT = ART_BOTTOM - 28
/** 나타날 때 이만큼 아래에서 떠오릅니다 */
const ART_RISE = 14

/** 한 글자를 찍는 간격. 한 줄로 끝나므로 아르세우스보다 조금 빠릅니다. */
const TYPE_MS = 38

export class NpcTalk {
  private readonly container: Phaser.GameObjects.Container
  private readonly line: Phaser.GameObjects.Text
  private readonly nameText: Phaser.GameObjects.Text
  private readonly roleText: Phaser.GameObjects.Text
  private readonly marker: Phaser.GameObjects.Text

  /** 사람이 바뀔 때마다 새로 그리는 것들 */
  private art?: Phaser.GameObjects.Image
  private face?: Phaser.GameObjects.Container

  private index = 0
  private settled = false
  private typing?: Phaser.Time.TimerEvent
  private finished = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly entries: readonly Greeting[],
    private readonly onDone: () => void,
  ) {
    this.container = scene.add.container(0, 0)
    this.container.setDepth(120)

    // 화면을 덮어 아래쪽 버튼으로 클릭이 새지 않게 합니다.
    const shade = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.55,
    )
    shade.setInteractive({ useHandCursor: false })
    shade.on(Phaser.Input.Events.POINTER_DOWN, () => this.submit())

    const box = scene.add.graphics()
    box.fillStyle(0x0d0b1a, 0.94)
    box.fillRoundedRect(BOX.x, BOX.y, BOX.width, BOX.height, 14)
    box.lineStyle(3, 0x6b5ea8, 1)
    box.strokeRoundedRect(BOX.x, BOX.y, BOX.width, BOX.height, 14)

    this.nameText = scene.add
      .text(PORTRAIT_X, PORTRAIT_Y + PORTRAIT_SIZE / 2 + 10, '', {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: '#ffd447',
      })
      .setOrigin(0.5, 0)

    this.roleText = scene.add
      .text(PORTRAIT_X, PORTRAIT_Y + PORTRAIT_SIZE / 2 + 32, '', {
        fontFamily: FontFamily.Body,
        fontSize: '14px',
        color: '#b7aecd',
      })
      .setOrigin(0.5, 0)

    this.line = scene.add.text(TEXT_LEFT, BOX.y + 30, '', {
      fontFamily: FontFamily.Body,
      fontSize: '22px',
      color: '#f3efff',
      wordWrap: { width: BOX.x + BOX.width - TEXT_LEFT - 28 },
      lineSpacing: 10,
    })

    this.marker = scene.add
      .text(BOX.x + BOX.width - 26, BOX.y + BOX.height - 24, '▼', {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: '#8f7fd4',
      })
      .setOrigin(1, 1)
    this.marker.setVisible(false)

    scene.tweens.add({
      targets: this.marker,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.container.add([shade, box, this.nameText, this.roleText, this.line, this.marker])

    this.show()
  }

  /** 위아래로 고를 것이 없습니다. 창 취급을 받으려면 있어야 합니다. */
  move(): void {}

  /** 찍는 중이면 즉시 끝내고, 다 찍었으면 다음 사람에게 넘깁니다. */
  submit(): void {
    if (!this.settled) {
      this.finishLine()
      return
    }

    if (this.index >= this.entries.length - 1) {
      this.finish()
      return
    }

    this.index += 1
    this.show()
  }

  /** 남은 인사를 건너뛰고 그대로 진행합니다. */
  cancel(): void {
    this.finish()
  }

  close(): void {
    this.typing?.remove()
    this.container.destroy(true)
  }

  private finish(): void {
    // 마지막 줄에서 두 번 눌리면 한 달이 두 번 흐를 수 있습니다.
    if (this.finished) return
    this.finished = true

    this.close()
    this.onDone()
  }

  /** 지금 차례인 포켓몬을 세우고 말을 꺼냅니다. */
  private show(): void {
    const entry = this.entries[this.index]
    if (!entry) {
      this.finish()
      return
    }

    this.typing?.remove()
    this.marker.setVisible(false)
    this.settled = false
    this.line.setText('')

    this.nameText.setText(entry.npc.name)
    this.roleText.setText(entry.npc.role)

    this.showNpc(entry)

    let shown = 0
    this.typing = this.scene.time.addEvent({
      delay: TYPE_MS,
      repeat: entry.line.length - 1,
      callback: () => {
        shown += 1
        this.line.setText(entry.line.slice(0, shown))
        if (shown === entry.line.length) this.settleLine()
      },
    })
  }

  /** 얼굴은 틀에, 전신은 대화창 위에 세웁니다. */
  private showNpc(entry: Greeting): void {
    this.art?.destroy()
    this.face?.destroy(true)

    const face = createPokemonFrame(
      this.scene,
      PORTRAIT_X,
      PORTRAIT_Y,
      npcPortraitKey(entry.npc.key),
      {
        size: PORTRAIT_SIZE,
        shape: 'rounded',
        background: 0x241f3d,
        ring: 0x8f7fd4,
        ringWidth: 3,
        padding: 5,
      },
    )
    face.setDepth(1)
    this.face = face

    // 대화창 바로 위에 서 있게 아래를 기준으로 놓습니다. 가운데를 기준으로
    // 잡으면 망치를 든 두드리짱처럼 위로 긴 그림이 화면 밖으로 잘립니다.
    const art = this.scene.add.image(GAME_WIDTH / 2, ART_BOTTOM + ART_RISE, npcArtKey(entry.npc.key))
    art.setOrigin(0.5, 1)
    art.setScale(Math.min(ART_MAX_HEIGHT / art.height, 1))
    art.setAlpha(0)
    this.art = art

    this.container.add([art, face])

    // 나타나면서 한 번 웁니다.
    playSfx(this.scene, npcCryKey(entry.npc.key))

    this.scene.tweens.add({
      targets: art,
      alpha: 1,
      y: ART_BOTTOM,
      duration: 420,
      ease: 'Sine.easeOut',
    })
  }

  private finishLine(): void {
    const entry = this.entries[this.index]
    if (!entry) return

    this.typing?.remove()
    this.line.setText(entry.line)
    this.settleLine()
  }

  private settleLine(): void {
    this.settled = true
    this.marker.setVisible(true)
  }
}
