import Phaser from 'phaser'

import { refreshBgmVolume } from '../audio/bgm'
import { getVolumes, setVolume, type VolumeChannel } from '../audio/volume'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SAVE_KEY, SceneKey } from '../constants'
import { addChoice, drawInnerPanel, drawParchmentFrame, PanelColor } from '../ui/panel'

const PANEL = { x: 120, y: 80, width: GAME_WIDTH - 240, height: 340 }

const TRACK_LEFT = PANEL.x + 210
const TRACK_WIDTH = 300
const ROW_TOP = PANEL.y + 86
const ROW_GAP = 62

/** 키보드로 조절할 때 한 번에 움직이는 폭 */
const STEP = 0.05

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
const COLOR_DISABLED = '#7b7159'

interface SliderRow {
  kind: 'slider'
  channel: VolumeChannel
  y: number
  label: Phaser.GameObjects.Text
  knob: Phaser.GameObjects.Arc
  value: Phaser.GameObjects.Text
}

interface ActionRow {
  kind: 'action'
  label: Phaser.GameObjects.Text
  run: () => void
  /** 고를 수 없는 상태인지 (세이브가 없을 때의 삭제 항목) */
  disabled: boolean
}

type Row = SliderRow | ActionRow

export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = []
  private selected = 0
  /** 확인 창이 떠 있는 동안에는 뒤쪽 조작을 막습니다. */
  private modal?: Phaser.GameObjects.Container
  private modalConfirm = false
  private toast?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Settings)
  }

  create(): void {
    this.rows = []
    this.selected = 0
    this.modal = undefined

    drawParchmentFrame(this)
    drawInnerPanel(this, PANEL, PanelColor.Night)

    this.add
      .text(GAME_WIDTH / 2, PANEL.y + 22, '설  정', {
        fontFamily: FontFamily.Body,
        fontSize: '28px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    const volumes = getVolumes()
    this.createSlider('master', '마스터 사운드', 0, volumes.master)
    this.createSlider('bgm', '배경음악', 1, volumes.bgm)
    this.createSlider('sfx', '효과음', 2, volumes.sfx)

    this.createAction('세이브 파일 삭제', ROW_TOP + 3 * ROW_GAP, () => this.askDelete(), {
      disabled: !this.hasSave(),
    })
    this.createAction('돌아가기', PANEL.y + PANEL.height + 40, () => this.leave())

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '↑ ↓ 항목    ← → 조절    Enter 선택    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(250, 0, 0, 0)
  }

  private createSlider(
    channel: VolumeChannel,
    text: string,
    index: number,
    value: number,
  ): void {
    const y = ROW_TOP + index * ROW_GAP
    const rowIndex = this.rows.length

    const label = this.add.text(PANEL.x + 40, y, text, {
      fontFamily: FontFamily.Body,
      fontSize: '22px',
      color: COLOR_IDLE,
    })
    label.setOrigin(0, 0.5)

    const track = this.add.graphics()
    track.fillStyle(0x0d0b1a, 0.8)
    track.fillRoundedRect(TRACK_LEFT, y - 6, TRACK_WIDTH, 12, 6)
    track.lineStyle(1, 0xb08d3f, 0.7)
    track.strokeRoundedRect(TRACK_LEFT, y - 6, TRACK_WIDTH, 12, 6)

    const hit = this.add
      .rectangle(TRACK_LEFT + TRACK_WIDTH / 2, y, TRACK_WIDTH, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true })

    const knob = this.add.circle(TRACK_LEFT + TRACK_WIDTH * value, y, 11, 0xffd447)
    knob.setStrokeStyle(2, 0x7a5f1c)
    knob.setInteractive({ useHandCursor: true, draggable: true })
    this.input.setDraggable(knob)

    const valueText = this.add.text(TRACK_LEFT + TRACK_WIDTH + 24, y, '', {
      fontFamily: FontFamily.Body,
      fontSize: '20px',
      color: COLOR_SELECTED,
    })
    valueText.setOrigin(0, 0.5)

    const row: SliderRow = { kind: 'slider', channel, y, label, knob, value: valueText }
    this.rows.push(row)

    const apply = (pointerX: number): void => {
      if (this.modal) return
      this.selected = rowIndex
      this.setSlider(row, (pointerX - TRACK_LEFT) / TRACK_WIDTH)
    }

    hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) =>
      apply(p.worldX),
    )
    knob.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (_p: Phaser.Input.Pointer, dragX: number) =>
      apply(dragX),
    )
  }

  private createAction(
    text: string,
    y: number,
    run: () => void,
    options: { disabled?: boolean } = {},
  ): void {
    const disabled = options.disabled ?? false
    const rowIndex = this.rows.length

    const label = addChoice(
      this,
      GAME_WIDTH / 2,
      y,
      text,
      () => {
        if (this.modal) return
        this.selected = rowIndex
        this.refresh()
        this.activate()
      },
      { fontSize: '22px', color: disabled ? COLOR_DISABLED : COLOR_IDLE },
    )

    this.rows.push({ kind: 'action', label, run, disabled })
  }

  private setSlider(row: SliderRow, raw: number): void {
    setVolume(this, row.channel, Math.min(1, Math.max(0, raw)))
    if (row.channel === 'bgm') {
      refreshBgmVolume(this)
    }
    this.refresh()
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.onUpDown(-1))
    keyboard.on('keydown-DOWN', () => this.onUpDown(1))
    keyboard.on('keydown-LEFT', () => this.onLeftRight(-STEP))
    keyboard.on('keydown-RIGHT', () => this.onLeftRight(STEP))
    keyboard.on('keydown-ENTER', () => this.onEnter())
    keyboard.on('keydown-SPACE', () => this.onEnter())
    keyboard.on('keydown-ESC', () => this.onEscape())
  }

  private onUpDown(delta: number): void {
    if (this.modal) return

    // 세이브가 없어 고를 수 없는 항목은 건너뜁니다.
    const count = this.rows.length
    for (let step = 1; step <= count; step += 1) {
      const index = (this.selected + delta * step + count * count) % count
      const row = this.rows[index]!
      if (row.kind === 'slider' || !row.disabled) {
        this.selected = index
        this.refresh()
        return
      }
    }
  }

  private onLeftRight(delta: number): void {
    if (this.modal) {
      // 확인 창에서는 예 / 아니오 사이를 오갑니다.
      this.modalConfirm = delta < 0
      this.refreshModal()
      return
    }

    const row = this.rows[this.selected]
    if (row?.kind !== 'slider') return

    this.setSlider(row, getVolumes()[row.channel] + delta)
  }

  private onEnter(): void {
    if (this.modal) {
      const confirmed = this.modalConfirm
      this.closeModal()
      if (confirmed) this.deleteSave()
      return
    }

    this.activate()
  }

  private onEscape(): void {
    if (this.modal) {
      this.closeModal()
      return
    }
    this.leave()
  }

  private activate(): void {
    const row = this.rows[this.selected]
    if (row?.kind !== 'action' || row.disabled) return
    row.run()
  }

  private refresh(): void {
    const volumes = getVolumes()

    this.rows.forEach((row, index) => {
      const selected = index === this.selected

      if (row.kind === 'slider') {
        const value = volumes[row.channel]
        row.knob.setPosition(TRACK_LEFT + TRACK_WIDTH * value, row.y)
        row.value.setText(`${Math.round(value * 100)}%`)
        row.label.setColor(selected ? COLOR_SELECTED : COLOR_IDLE)
        row.knob.setFillStyle(selected ? 0xffd447 : 0xcfc6a0)
        return
      }

      row.label.setColor(
        row.disabled ? COLOR_DISABLED : selected ? COLOR_SELECTED : COLOR_IDLE,
      )
    })
  }

  // --- 세이브 삭제 ---

  private hasSave(): boolean {
    try {
      return window.localStorage.getItem(SAVE_KEY) !== null
    } catch {
      return false
    }
  }

  /** 지우기 전에 한 번 더 묻습니다. 되돌릴 수 없는 동작입니다. */
  private askDelete(): void {
    if (this.modal) return

    // 실수로 지우는 일이 없도록 "아니오" 에서 시작합니다.
    this.modalConfirm = false

    const width = 460
    const height = 190
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)

    const shade = this.add.graphics()
    shade.fillStyle(0x000000, 0.66)
    shade.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)

    const box = this.add.graphics()
    box.fillStyle(0x241f3d, 1)
    box.fillRect(-width / 2, -height / 2, width, height)
    box.lineStyle(3, 0xb08d3f, 1)
    box.strokeRect(-width / 2, -height / 2, width, height)
    box.lineStyle(1, 0xd8bd76, 0.85)
    box.strokeRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12)

    const question = this.add
      .text(0, -height / 2 + 34, '세이브 파일을 삭제하시겠습니까?', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    const warning = this.add
      .text(0, -height / 2 + 74, '되돌릴 수 없습니다.', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#ffb4b4',
      })
      .setOrigin(0.5, 0)

    const yes = addChoice(this, -80, height / 2 - 46, '예', () => {
      this.closeModal()
      this.deleteSave()
    })
    const no = addChoice(this, 80, height / 2 - 46, '아니오', () => this.closeModal())

    container.add([shade, box, question, warning, yes, no])
    container.setDepth(100)
    // 새로고침에서 색을 다시 칠할 수 있도록 들고 있습니다.
    container.setData('yes', yes)
    container.setData('no', no)

    this.modal = container
    this.refreshModal()
  }

  private refreshModal(): void {
    if (!this.modal) return

    const yes = this.modal.getData('yes') as Phaser.GameObjects.Text
    const no = this.modal.getData('no') as Phaser.GameObjects.Text

    yes.setColor(this.modalConfirm ? COLOR_SELECTED : COLOR_IDLE)
    no.setColor(this.modalConfirm ? COLOR_IDLE : COLOR_SELECTED)
  }

  private closeModal(): void {
    this.modal?.destroy(true)
    this.modal = undefined
  }

  private deleteSave(): void {
    try {
      window.localStorage.removeItem(SAVE_KEY)
    } catch {
      // 저장소가 막혀 있으면 지울 것도 없습니다.
    }

    // 지우고 나면 더 이상 고를 수 없는 항목이 됩니다.
    for (const row of this.rows) {
      if (row.kind === 'action' && row.label.text === '세이브 파일 삭제') {
        row.disabled = true
      }
    }

    // 비활성이 된 항목에 선택이 머물지 않도록 옮깁니다.
    this.onUpDown(1)
    this.refresh()
    this.showToast('세이브 파일을 삭제했습니다')
  }

  private showToast(message: string): void {
    this.toast?.destroy()

    // 패널 테두리에 걸치지 않도록 안쪽에 둡니다.
    const toast = this.add.text(GAME_WIDTH / 2, PANEL.y + PANEL.height - 44, message, {
      fontFamily: FontFamily.Body,
      fontSize: '18px',
      color: '#ffd447',
    })
    toast.setOrigin(0.5, 0)
    this.toast = toast

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1600,
      duration: 500,
      onComplete: () => toast.destroy(),
    })
  }

  private leave(): void {
    this.scene.start(SceneKey.Menu)
  }
}
