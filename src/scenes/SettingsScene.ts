import Phaser from 'phaser'

import { refreshBgmVolume } from '../audio/bgm'
import { getVolumes, setVolume, type VolumeChannel } from '../audio/volume'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { addChoice, drawInnerPanel, drawParchmentFrame, PanelColor } from '../ui/panel'

const PANEL = { x: 120, y: 96, width: GAME_WIDTH - 240, height: 300 }

const TRACK_LEFT = PANEL.x + 210
const TRACK_WIDTH = 300
const ROW_TOP = PANEL.y + 86
const ROW_GAP = 62

/** 키보드로 조절할 때 한 번에 움직이는 폭 */
const STEP = 0.05

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

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
}

type Row = SliderRow | ActionRow

export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = []
  private selected = 0

  constructor() {
    super(SceneKey.Settings)
  }

  create(): void {
    this.rows = []
    this.selected = 0

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

    this.createAction('돌아가기', PANEL.y + PANEL.height + 40, () => this.leave())

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, '↑ ↓ 항목    ← → 조절    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(250, 0, 0, 0)
  }

  private createSlider(channel: VolumeChannel, text: string, index: number, value: number): void {
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

  private createAction(text: string, y: number, run: () => void): void {
    const rowIndex = this.rows.length

    const label = addChoice(
      this,
      GAME_WIDTH / 2,
      y,
      text,
      () => {
        this.selected = rowIndex
        this.refresh()
        run()
      },
      {
        fontSize: '22px',
        color: COLOR_IDLE,
        onFocus: () => {
          this.selected = rowIndex
          this.refresh()
        },
      },
    )

    this.rows.push({ kind: 'action', label, run })
  }

  private setSlider(row: SliderRow, raw: number): void {
    setVolume(this, row.channel, Math.min(1, Math.max(0, raw)))
    if (row.channel === 'bgm') {
      // 지금 흐르는 곡에 바로 반영해 귀로 확인할 수 있게 합니다.
      refreshBgmVolume(this)
    }
    this.refresh()
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.move(-1))
    keyboard.on('keydown-DOWN', () => this.move(1))
    keyboard.on('keydown-LEFT', () => this.nudge(-STEP))
    keyboard.on('keydown-RIGHT', () => this.nudge(STEP))
    keyboard.on('keydown-ENTER', () => this.activate())
    keyboard.on('keydown-SPACE', () => this.activate())
    keyboard.on('keydown-ESC', () => this.leave())
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + this.rows.length) % this.rows.length
    this.refresh()
  }

  private nudge(delta: number): void {
    const row = this.rows[this.selected]
    if (row?.kind !== 'slider') return

    this.setSlider(row, getVolumes()[row.channel] + delta)
  }

  private activate(): void {
    const row = this.rows[this.selected]
    if (row?.kind !== 'action') return
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

      row.label.setColor(selected ? COLOR_SELECTED : COLOR_IDLE)
    })
  }

  private leave(): void {
    this.scene.start(SceneKey.Menu)
  }
}
