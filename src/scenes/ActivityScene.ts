import Phaser from 'phaser'

import {
  canAfford,
  doActivity,
  JOBS,
  LESSONS,
  type Activity,
  type ActivityKind,
} from '../activities'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { ensureRaisingState, TYPES, type RaisingState } from '../raising'
import type { SaveData } from '../save'
import { withJosa } from '../ui/hangul'
import { addChoice, drawInnerPanel, drawParchmentFrame, PanelColor } from '../ui/panel'

const PANEL = { x: 40, y: 62, width: GAME_WIDTH - 80, height: 350 }

const COLUMNS = 2
const ROW_GAP = 50
const COLUMN_WIDTH = (PANEL.width - 60) / COLUMNS
const GRID_LEFT = PANEL.x + 30
const GRID_TOP = PANEL.y + 74

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
const COLOR_BLOCKED = '#8a7a6a'

const TYPE_INFO = new Map(TYPES.map((t) => [t.key, t]))

const HEADINGS: Record<ActivityKind, { title: string; verb: string }> = {
  lesson: { title: '무엇을 배우러 갈까요?', verb: '배우기' },
  job: { title: '어떤 일을 할까요?', verb: '일하기' },
}

export interface ActivitySceneData extends SaveData {
  kind: ActivityKind
}

/**
 * 한 주를 무엇에 쓸지 고르는 화면입니다.
 * 수업과 일은 화면이 같아서 한 씬으로 함께 다룹니다.
 */
export class ActivityScene extends Phaser.Scene {
  private save!: SaveData
  private state!: RaisingState
  private kind: ActivityKind = 'lesson'
  private list: readonly Activity[] = LESSONS

  private labels: Phaser.GameObjects.Text[] = []
  private selected = 0

  private moneyText!: Phaser.GameObjects.Text
  private detail!: Phaser.GameObjects.Text
  private notice?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Activity)
  }

  init(data: ActivitySceneData): void {
    this.save = data
    this.state = ensureRaisingState(data.raising)
    this.kind = data.kind ?? 'lesson'
    this.list = this.kind === 'job' ? JOBS : LESSONS
  }

  create(): void {
    this.labels = []
    this.selected = 0

    drawParchmentFrame(this)
    drawInnerPanel(this, PANEL, PanelColor.Night)

    this.add
      .text(PANEL.x + 26, PANEL.y + 18, HEADINGS[this.kind].title, {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    this.moneyText = this.add
      .text(PANEL.x + PANEL.width - 26, PANEL.y + 20, '', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#ffd447',
      })
      .setOrigin(1, 0)

    this.list.forEach((activity, index) => this.createRow(activity, index))

    this.detail = this.add
      .text(GAME_WIDTH / 2, PANEL.y + PANEL.height + 22, '', {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: '#5a4a28',
        align: 'center',
      })
      .setOrigin(0.5, 0)

    addChoice(this, GAME_WIDTH / 2, GAME_HEIGHT - 58, '돌아가기', () => this.leave(), {
      fontSize: '21px',
      color: '#6b5a34',
      onFocus: () => undefined,
    })

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 16,
        `방향키 이동    Enter ${HEADINGS[this.kind].verb}    Esc 돌아가기`,
        { fontFamily: FontFamily.Body, fontSize: '15px', color: '#7c6a4a' },
      )
      .setOrigin(0.5, 1)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(250, 0, 0, 0)
  }

  private createRow(activity: Activity, index: number): void {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const x = GRID_LEFT + column * COLUMN_WIDTH
    const y = GRID_TOP + row * ROW_GAP

    // 버는 돈은 +, 내는 돈은 그대로 금액만 보입니다.
    const money = activity.money >= 0 ? `+₽${activity.money}` : `₽${-activity.money}`

    const label = addChoice(
      this,
      x,
      y,
      `${activity.name}   ${money}`,
      () => {
        this.selected = index
        this.refresh()
        this.perform(activity)
      },
      {
        fontSize: '19px',
        color: COLOR_IDLE,
        origin: [0, 0.5],
        onFocus: () => {
          this.selected = index
          this.refresh()
        },
      },
    )
    this.labels.push(label)

    // 오르는 타입을 색 조각으로 붙여 한눈에 보이게 합니다.
    const badge = this.add.graphics()
    activity.types.forEach((type, i) => {
      const info = TYPE_INFO.get(type)
      if (!info) return

      const bx = x + COLUMN_WIDTH - 92 + i * 22
      badge.fillStyle(info.color, 1)
      badge.fillRect(bx, y - 7, 18, 14)
      badge.lineStyle(1, 0x000000, 0.35)
      badge.strokeRect(bx, y - 7, 18, 14)
    })
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.move(-COLUMNS))
    keyboard.on('keydown-DOWN', () => this.move(COLUMNS))
    keyboard.on('keydown-LEFT', () => this.move(-1))
    keyboard.on('keydown-RIGHT', () => this.move(1))
    keyboard.on('keydown-ENTER', () => this.perform(this.list[this.selected]!))
    keyboard.on('keydown-SPACE', () => this.perform(this.list[this.selected]!))
    keyboard.on('keydown-ESC', () => this.leave())
  }

  private move(delta: number): void {
    const count = this.list.length
    this.selected = (this.selected + delta + count) % count
    this.refresh()
  }

  private perform(activity: Activity): void {
    if (!canAfford(this.state, activity)) {
      this.showNotice(`수업료가 모자랍니다 (₽${-activity.money})`)
      return
    }

    const result = doActivity(this.state, activity)
    this.state = result.state

    const gains = result.typeGains
      .map((g) => `${TYPE_INFO.get(g.type)?.label ?? g.type} +${g.gain}`)
      .join('  ')

    // "도서관 정리를 일했다" 는 말이 안 되므로 일 쪽은 "했다" 로 받습니다.
    const verb = activity.kind === 'job' ? '했다' : '배웠다'
    const earned = activity.money > 0 ? `  ₽+${activity.money}` : ''

    // 한 주가 지났으니 방으로 돌아갑니다.
    this.leave(`${withJosa(activity.name, '을', '를')} ${verb}.   ${gains}${earned}`)
  }

  private refresh(): void {
    this.moneyText.setText(`₽ ${this.state.money.toLocaleString()}`)

    this.labels.forEach((label, index) => {
      const activity = this.list[index]!
      const ok = canAfford(this.state, activity)

      label.setColor(
        index === this.selected ? COLOR_SELECTED : ok ? COLOR_IDLE : COLOR_BLOCKED,
      )
    })

    const activity = this.list[this.selected]
    if (!activity) return

    const types = activity.types.map((t) => TYPE_INFO.get(t)?.label ?? t).join(' · ')
    this.detail.setText(
      `${activity.description}    [ ${types} ]    스트레스 +${activity.stress}`,
    )
  }

  private showNotice(message: string): void {
    this.notice?.destroy()

    const notice = this.add.text(GAME_WIDTH / 2, PANEL.y + PANEL.height - 22, message, {
      fontFamily: FontFamily.Body,
      fontSize: '18px',
      color: '#ffb4b4',
    })
    notice.setOrigin(0.5, 0.5)
    this.notice = notice

    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 1400,
      duration: 500,
      onComplete: () => notice.destroy(),
    })
  }

  /** 방으로 돌아갑니다. 하고 나온 경우에는 결과를 함께 전합니다. */
  private leave(notice?: string): void {
    this.cameras.main.fadeOut(250, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Raising, {
        ...this.save,
        raising: this.state,
        notice,
      })
    })
  }
}
