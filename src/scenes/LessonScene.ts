import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { canAfford, LESSONS, takeLesson, type Lesson } from '../lessons'
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
const COLOR_UNAFFORDABLE = '#8a7a6a'

/** 타입 이름과 색을 빠르게 찾기 위한 표 */
const TYPE_INFO = new Map(TYPES.map((t) => [t.key, t]))

/**
 * 배우러 갈 곳을 고르는 화면입니다.
 * 무엇을 배우면 어떤 타입에 익숙해지는지 함께 보여 줍니다.
 */
export class LessonScene extends Phaser.Scene {
  private save!: SaveData
  private state!: RaisingState

  private labels: Phaser.GameObjects.Text[] = []
  private badges: Phaser.GameObjects.Graphics[] = []
  private selected = 0

  private moneyText!: Phaser.GameObjects.Text
  private detail!: Phaser.GameObjects.Text
  private notice?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Lesson)
  }

  init(data: SaveData): void {
    this.save = data
    this.state = ensureRaisingState(data.raising)
  }

  create(): void {
    this.labels = []
    this.badges = []
    this.selected = 0

    drawParchmentFrame(this)
    drawInnerPanel(this, PANEL, PanelColor.Night)

    this.add
      .text(PANEL.x + 26, PANEL.y + 18, '무엇을 배우러 갈까요?', {
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

    LESSONS.forEach((lesson, index) => this.createRow(lesson, index))

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
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '방향키 이동    Enter 배우기    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5, 1)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(250, 0, 0, 0)
  }

  private createRow(lesson: Lesson, index: number): void {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const x = GRID_LEFT + column * COLUMN_WIDTH
    const y = GRID_TOP + row * ROW_GAP

    const label = addChoice(
      this,
      x,
      y,
      `${lesson.name}   ₽${lesson.cost}`,
      () => {
        this.selected = index
        this.refresh()
        this.learn(lesson)
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
    lesson.types.forEach((type, i) => {
      const info = TYPE_INFO.get(type)
      if (!info) return

      badge.fillStyle(info.color, 1)
      badge.fillRect(x + COLUMN_WIDTH - 92 + i * 22, y - 7, 18, 14)
      badge.lineStyle(1, 0x000000, 0.35)
      badge.strokeRect(x + COLUMN_WIDTH - 92 + i * 22, y - 7, 18, 14)
    })
    this.badges.push(badge)
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.move(-COLUMNS))
    keyboard.on('keydown-DOWN', () => this.move(COLUMNS))
    keyboard.on('keydown-LEFT', () => this.move(-1))
    keyboard.on('keydown-RIGHT', () => this.move(1))
    keyboard.on('keydown-ENTER', () => this.learn(LESSONS[this.selected]!))
    keyboard.on('keydown-SPACE', () => this.learn(LESSONS[this.selected]!))
    keyboard.on('keydown-ESC', () => this.leave())
  }

  private move(delta: number): void {
    const count = LESSONS.length
    this.selected = (this.selected + delta + count) % count
    this.refresh()
  }

  private learn(lesson: Lesson): void {
    if (!canAfford(this.state, lesson)) {
      this.showNotice(`수업료가 모자랍니다 (₽${lesson.cost})`)
      return
    }

    const result = takeLesson(this.state, lesson)
    this.state = result.state

    // 배우고 나면 한 주가 지났으니 방으로 돌아갑니다.
    const gains = result.typeGains
      .map((g) => `${TYPE_INFO.get(g.type)?.label ?? g.type} +${g.gain}`)
      .join('  ')

    this.leave(`${withJosa(lesson.name, '을', '를')} 배웠다.   ${gains}`)
  }

  private refresh(): void {
    this.moneyText.setText(`₽ ${this.state.money.toLocaleString()}`)

    this.labels.forEach((label, index) => {
      const lesson = LESSONS[index]!
      const affordable = canAfford(this.state, lesson)

      label.setColor(
        index === this.selected ? COLOR_SELECTED : affordable ? COLOR_IDLE : COLOR_UNAFFORDABLE,
      )
    })

    const lesson = LESSONS[this.selected]
    if (!lesson) return

    const types = lesson.types.map((t) => TYPE_INFO.get(t)?.label ?? t).join(' · ')
    this.detail.setText(`${lesson.description}    [ ${types} ]    스트레스 +${lesson.stress}`)
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

  /** 방으로 돌아갑니다. 배우고 나온 경우에는 결과를 함께 전합니다. */
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
