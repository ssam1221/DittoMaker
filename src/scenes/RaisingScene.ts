import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { AudioKey, FontFamily, GAME_HEIGHT, GAME_WIDTH, MusicFile, SceneKey } from '../constants'
import {
  ageInMonths,
  conditionLabel,
  dateOf,
  ensureRaisingState,
  rest,
  STAT_LABELS,
  type RaisingState,
} from '../raising'
import { writeSlot, type SaveData } from '../save'
import { addChoice, drawParchmentFrame, GOLD, GOLD_LIGHT } from '../ui/panel'

const DITTO_KEY = '0132-메타몽'

/** 위쪽 날짜·소지금 띠 */
const HEADER = { x: 20, y: 16, width: GAME_WIDTH - 40, height: 36 }

/** 메타몽이 있는 방 */
const ROOM = { x: 20, y: 64, width: 570, height: 386 }

/** 오른쪽 상태 판 */
const STATUS = { x: 606, y: 64, width: GAME_WIDTH - 626, height: 386 }

/** 아래 명령 띠 */
const COMMAND_Y = 486

const BAR_LEFT = STATUS.x + 84
const BAR_WIDTH = STATUS.width - 132
const BAR_TOP = STATUS.y + 116
const BAR_GAP = 34

/** 막대가 가득 차는 기준값. 999 를 기준으로 잡으면 초반에 거의 안 보입니다. */
const BAR_FULL = 200

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

interface Command {
  label: string
  run: () => void
}

/**
 * 육성 메인 화면입니다. 날짜와 소지금, 메타몽이 있는 방, 능력치,
 * 그리고 아래에 명령 띠가 놓인 구성입니다.
 */
export class RaisingScene extends Phaser.Scene {
  private save!: SaveData
  private state!: RaisingState

  private commands: Command[] = []
  private buttons: Phaser.GameObjects.Text[] = []
  private selected = 0

  private dateText!: Phaser.GameObjects.Text
  private moneyText!: Phaser.GameObjects.Text
  private ageText!: Phaser.GameObjects.Text
  private conditionText!: Phaser.GameObjects.Text
  private statValues: Phaser.GameObjects.Text[] = []
  private bars!: Phaser.GameObjects.Graphics
  private notice?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Raising)
  }

  init(data: SaveData): void {
    this.save = data
    this.state = ensureRaisingState(data.raising)
  }

  preload(): void {
    this.load.image(DITTO_KEY, `assets/pokemon/artwork/${DITTO_KEY}.png`)
    this.load.audio(AudioKey.Town, `music/${encodeURIComponent(MusicFile.Town)}`)
  }

  create(): void {
    this.statValues = []
    this.buttons = []
    this.selected = 0

    playBgm(this, AudioKey.Town)

    drawParchmentFrame(this)
    this.createHeader()
    this.createRoom()
    this.createStatus()
    this.createCommands()

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  // --- 화면 만들기 ---

  private createHeader(): void {
    this.panel(HEADER, 0x232a4d)

    this.dateText = this.add
      .text(HEADER.x + 20, HEADER.y + HEADER.height / 2, '', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0.5)

    this.moneyText = this.add
      .text(HEADER.x + HEADER.width - 20, HEADER.y + HEADER.height / 2, '', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#ffd447',
      })
      .setOrigin(1, 0.5)
  }

  /** 창문과 바닥이 있는 방. 그림 파일 없이 도형으로 그립니다. */
  private createRoom(): void {
    const g = this.add.graphics()

    const floorY = ROOM.y + ROOM.height * 0.62

    g.fillStyle(0x2f3560, 1)
    g.fillRect(ROOM.x, ROOM.y, ROOM.width, floorY - ROOM.y)
    g.fillStyle(0x4a3f6b, 1)
    g.fillRect(ROOM.x, floorY, ROOM.width, ROOM.y + ROOM.height - floorY)

    // 창문 — 오프닝의 우주와 이어지도록 밤하늘을 담았습니다.
    const win = { x: ROOM.x + 60, y: ROOM.y + 44, w: 150, h: 110 }
    g.fillStyle(0x141026, 1)
    g.fillRect(win.x, win.y, win.w, win.h)
    g.lineStyle(4, GOLD, 1)
    g.strokeRect(win.x, win.y, win.w, win.h)
    g.lineBetween(win.x + win.w / 2, win.y, win.x + win.w / 2, win.y + win.h)
    g.lineBetween(win.x, win.y + win.h / 2, win.x + win.w, win.y + win.h / 2)

    g.fillStyle(0xffffff, 0.9)
    for (let i = 0; i < 18; i += 1) {
      const x = win.x + 8 + ((i * 37) % (win.w - 16))
      const y = win.y + 10 + ((i * 53) % (win.h - 20))
      g.fillCircle(x, y, i % 4 === 0 ? 1.8 : 1)
    }

    // 바닥 깔개
    g.fillStyle(0x6b4a7a, 0.6)
    g.fillEllipse(ROOM.x + ROOM.width * 0.55, floorY + 90, 300, 80)

    g.lineStyle(3, GOLD, 1)
    g.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height)
    g.lineStyle(1, GOLD_LIGHT, 0.8)
    g.strokeRect(ROOM.x + 5, ROOM.y + 5, ROOM.width - 10, ROOM.height - 10)

    const ditto = this.add.image(ROOM.x + ROOM.width * 0.55, floorY + 40, DITTO_KEY)
    ditto.setScale(190 / ditto.height)

    this.tweens.add({
      targets: ditto,
      scaleX: ditto.scaleX * 1.05,
      scaleY: ditto.scaleY * 0.95,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createStatus(): void {
    this.panel(STATUS, 0x232a4d)

    this.add
      .text(STATUS.x + STATUS.width / 2, STATUS.y + 18, this.save.dittoName, {
        fontFamily: FontFamily.Body,
        fontSize: '26px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    this.ageText = this.add
      .text(STATUS.x + STATUS.width / 2, STATUS.y + 54, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#b7aecd',
      })
      .setOrigin(0.5, 0)

    const divider = this.add.graphics()
    divider.lineStyle(1, GOLD, 0.6)
    divider.lineBetween(STATUS.x + 20, STATUS.y + 88, STATUS.x + STATUS.width - 20, STATUS.y + 88)

    this.bars = this.add.graphics()

    STAT_LABELS.forEach((stat, index) => {
      const y = BAR_TOP + index * BAR_GAP

      this.add
        .text(STATUS.x + 20, y, stat.label, {
          fontFamily: FontFamily.Body,
          fontSize: '17px',
          color: COLOR_IDLE,
        })
        .setOrigin(0, 0.5)

      this.statValues.push(
        this.add
          .text(STATUS.x + STATUS.width - 20, y, '', {
            fontFamily: FontFamily.Body,
            fontSize: '17px',
            color: '#ffd447',
          })
          .setOrigin(1, 0.5),
      )
    })

    this.conditionText = this.add
      .text(STATUS.x + STATUS.width / 2, STATUS.y + STATUS.height - 44, '', {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: '#a8d8b0',
      })
      .setOrigin(0.5, 0)
  }

  private createCommands(): void {
    this.commands = [
      { label: '훈련', run: () => this.notImplemented('훈련') },
      { label: '모험', run: () => this.notImplemented('모험') },
      { label: '상점', run: () => this.notImplemented('상점') },
      { label: '대화', run: () => this.notImplemented('대화') },
      { label: '휴식', run: () => this.doRest() },
      { label: '저장', run: () => this.doSave() },
    ]

    const span = GAME_WIDTH - 120
    this.commands.forEach((command, index) => {
      const x = 60 + (span / (this.commands.length - 1)) * index

      this.buttons.push(
        addChoice(this, x, COMMAND_Y, command.label, () => {
          this.selected = index
          this.refresh()
          command.run()
        }, {
          fontSize: '24px',
          color: COLOR_IDLE,
          onFocus: () => {
            this.selected = index
            this.refresh()
          },
        }),
      )
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '← → 명령    Enter 실행    Esc 메뉴로', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5, 1)
  }

  private panel(rect: { x: number; y: number; width: number; height: number }, color: number): void {
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(3, GOLD, 1)
    g.strokeRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(1, GOLD_LIGHT, 0.8)
    g.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10)
  }

  // --- 조작 ---

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-LEFT', () => this.move(-1))
    keyboard.on('keydown-RIGHT', () => this.move(1))
    keyboard.on('keydown-ENTER', () => this.commands[this.selected]?.run())
    keyboard.on('keydown-SPACE', () => this.commands[this.selected]?.run())
    keyboard.on('keydown-ESC', () => this.scene.start(SceneKey.Menu))
  }

  private move(delta: number): void {
    const count = this.commands.length
    this.selected = (this.selected + delta + count) % count
    this.refresh()
  }

  private doRest(): void {
    this.state = rest(this.state)
    this.refresh()
    this.showNotice('한 주를 쉬었습니다')
  }

  private doSave(): void {
    const slot = this.save.slot
    if (!slot) {
      this.showNotice('저장할 슬롯을 찾지 못했습니다')
      return
    }

    writeSlot(slot, { ...this.save, raising: this.state })
    this.showNotice(`${slot}번 슬롯에 저장했습니다`)
  }

  private notImplemented(label: string): void {
    this.showNotice(`${label}은 아직 준비 중입니다`)
  }

  // --- 표시 갱신 ---

  private refresh(): void {
    const date = dateOf(this.save.year, this.state.week)
    this.dateText.setText(`${date.year}년 ${date.month}월 ${date.week}주차`)
    this.moneyText.setText(`₽ ${this.state.money.toLocaleString()}`)

    const months = ageInMonths(this.state.week)
    this.ageText.setText(
      months === 0 ? '태어난 지 얼마 되지 않았다' : `생후 ${months}개월`,
    )
    this.conditionText.setText(`컨디션 ${conditionLabel(this.state.condition)}`)

    this.bars.clear()
    STAT_LABELS.forEach((stat, index) => {
      const value = this.state.stats[stat.key]
      const y = BAR_TOP + index * BAR_GAP

      this.bars.fillStyle(0x0d0b1a, 0.85)
      this.bars.fillRect(BAR_LEFT, y - 7, BAR_WIDTH, 14)

      this.bars.fillStyle(0xffd447, 1)
      this.bars.fillRect(BAR_LEFT, y - 7, BAR_WIDTH * Math.min(1, value / BAR_FULL), 14)

      this.bars.lineStyle(1, GOLD, 0.8)
      this.bars.strokeRect(BAR_LEFT, y - 7, BAR_WIDTH, 14)

      this.statValues[index]?.setText(`${value}`)
    })

    this.buttons.forEach((button, index) => {
      button.setColor(index === this.selected ? COLOR_SELECTED : COLOR_IDLE)
    })
  }

  private showNotice(message: string): void {
    this.notice?.destroy()

    // 방 패널 테두리에 걸치지 않도록 안쪽 아래에 띄웁니다.
    const notice = this.add.text(ROOM.x + ROOM.width / 2, ROOM.y + ROOM.height - 28, message, {
      fontFamily: FontFamily.Body,
      fontSize: '18px',
      color: '#ffd447',
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
}
