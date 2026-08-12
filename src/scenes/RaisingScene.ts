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
  TYPE_MAX,
  TYPES,
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
const BAR_TOP = STATUS.y + 132
const BAR_GAP = 30

/** 막대가 가득 차는 기준값. 999 를 기준으로 잡으면 초반에 거의 안 보입니다. */
const BAR_FULL = 200

/** 타입 적성 격자 — 열여덟 종을 두 줄로 나눠 놓습니다. */
const TYPE_TOP = STATUS.y + 128
const TYPE_GAP = 29
const TYPE_COL = 155
const TYPE_BAR_LEFT = 52
const TYPE_BAR_WIDTH = 62

type Page = 'stats' | 'types'

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
  private typeValues: Phaser.GameObjects.Text[] = []
  private bars!: Phaser.GameObjects.Graphics
  private typeBars!: Phaser.GameObjects.Graphics
  private notice?: Phaser.GameObjects.Text

  private page: Page = 'stats'
  private statsPage: Phaser.GameObjects.GameObject[] = []
  private typesPage: Phaser.GameObjects.GameObject[] = []
  private tabs: { page: Page; text: Phaser.GameObjects.Text }[] = []
  private tabUnderline!: Phaser.GameObjects.Graphics

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

    this.createTabs()

    const divider = this.add.graphics()
    divider.lineStyle(1, GOLD, 0.6)
    divider.lineBetween(STATUS.x + 20, STATUS.y + 108, STATUS.x + STATUS.width - 20, STATUS.y + 108)

    this.createStatsPage()
    this.createTypesPage()
    this.showPage('stats')
  }

  /** 능력치 / 타입 을 오가는 탭 */
  private createTabs(): void {
    const labels: ReadonlyArray<{ page: Page; label: string }> = [
      { page: 'stats', label: '능력치' },
      { page: 'types', label: '타입' },
    ]

    // 아래 두 열 바로 위에 벌려 놓으면 열 머리글처럼 읽힙니다. 가운데로
    // 모으고 사이에 구분선을 두어 탭이라는 게 드러나게 합니다.
    const center = STATUS.x + STATUS.width / 2
    const y = STATUS.y + 88

    this.add
      .text(center, y, '|', { fontFamily: FontFamily.Body, fontSize: '16px', color: '#6c6488' })
      .setOrigin(0.5)

    labels.forEach((tab, index) => {
      const x = center + (index === 0 ? -46 : 46)
      const text = addChoice(this, x, y, tab.label, () => this.showPage(tab.page), {
        fontSize: '18px',
        color: COLOR_IDLE,
        onFocus: () => undefined,
      })
      this.tabs.push({ page: tab.page, text })
    })

    this.tabUnderline = this.add.graphics()
  }

  private createStatsPage(): void {
    this.bars = this.add.graphics()
    this.statsPage.push(this.bars)

    // 능력치 여섯 줄에 스트레스를 한 줄 덧붙입니다.
    const rows = [...STAT_LABELS.map((s) => s.label), '스트레스']

    rows.forEach((label, index) => {
      const y = BAR_TOP + index * BAR_GAP

      this.statsPage.push(
        this.add
          .text(STATUS.x + 20, y, label, {
            fontFamily: FontFamily.Body,
            fontSize: '16px',
            color: label === '스트레스' ? '#e5a0a0' : COLOR_IDLE,
          })
          .setOrigin(0, 0.5),
      )

      const value = this.add
        .text(STATUS.x + STATUS.width - 20, y, '', {
          fontFamily: FontFamily.Body,
          fontSize: '16px',
          color: '#ffd447',
        })
        .setOrigin(1, 0.5)

      this.statValues.push(value)
      this.statsPage.push(value)
    })

    this.conditionText = this.add
      .text(STATUS.x + STATUS.width / 2, STATUS.y + STATUS.height - 36, '', {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: '#a8d8b0',
      })
      .setOrigin(0.5, 0)
    this.statsPage.push(this.conditionText)
  }

  private createTypesPage(): void {
    this.typeBars = this.add.graphics()
    this.typesPage.push(this.typeBars)

    TYPES.forEach((type, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = STATUS.x + 16 + column * TYPE_COL
      const y = TYPE_TOP + row * TYPE_GAP

      // 타입 이름과 숫자는 작게 찍히므로 픽셀 폰트를 피합니다.
      this.typesPage.push(
        this.add
          .text(x, y, type.label, {
            fontFamily: FontFamily.Plain,
            fontSize: '13px',
            color: COLOR_IDLE,
          })
          .setOrigin(0, 0.5),
      )

      const value = this.add
        .text(x + 140, y, '', {
          fontFamily: FontFamily.Plain,
          fontSize: '13px',
          color: '#ffd447',
        })
        .setOrigin(1, 0.5)

      this.typeValues.push(value)
      this.typesPage.push(value)
    })
  }

  private showPage(page: Page): void {
    this.page = page

    this.statsPage.forEach((o) => (o as Phaser.GameObjects.Image).setVisible(page === 'stats'))
    this.typesPage.forEach((o) => (o as Phaser.GameObjects.Image).setVisible(page === 'types'))
    this.tabs.forEach((tab) => tab.text.setColor(tab.page === page ? COLOR_SELECTED : COLOR_IDLE))

    // 고른 탭 아래에 밑줄을 그어 어느 쪽을 보고 있는지 분명히 합니다.
    const active = this.tabs.find((tab) => tab.page === page)?.text
    this.tabUnderline.clear()
    if (active) {
      this.tabUnderline.lineStyle(2, 0xffd447, 1)
      this.tabUnderline.lineBetween(
        active.x - active.displayWidth / 2,
        active.y + 15,
        active.x + active.displayWidth / 2,
        active.y + 15,
      )
    }

    this.refresh()
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
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '← → 명령    Enter 실행    Tab 능력치/타입    Esc 메뉴로', {
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
    // 오른쪽 판을 능력치 / 타입 사이에서 넘깁니다.
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault()
      this.showPage(this.page === 'stats' ? 'types' : 'stats')
    })
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

    this.drawStatBars()
    this.drawTypeBars()

    this.buttons.forEach((button, index) => {
      button.setColor(index === this.selected ? COLOR_SELECTED : COLOR_IDLE)
    })
  }

  private drawStatBars(): void {
    this.bars.clear()
    if (this.page !== 'stats') return

    const rows: ReadonlyArray<{ value: number; full: number; color: number }> = [
      ...STAT_LABELS.map((stat) => ({
        value: this.state.stats[stat.key],
        full: BAR_FULL,
        color: 0xffd447,
      })),
      // 스트레스는 낮을수록 좋으니 색을 달리해 눈에 띄게 둡니다.
      { value: this.state.stress, full: 100, color: 0xe06666 },
    ]

    rows.forEach((row, index) => {
      const y = BAR_TOP + index * BAR_GAP

      this.bars.fillStyle(0x0d0b1a, 0.85)
      this.bars.fillRect(BAR_LEFT, y - 7, BAR_WIDTH, 14)

      this.bars.fillStyle(row.color, 1)
      this.bars.fillRect(BAR_LEFT, y - 7, BAR_WIDTH * Math.min(1, row.value / row.full), 14)

      this.bars.lineStyle(1, GOLD, 0.8)
      this.bars.strokeRect(BAR_LEFT, y - 7, BAR_WIDTH, 14)

      this.statValues[index]?.setText(`${row.value}`)
    })
  }

  private drawTypeBars(): void {
    this.typeBars.clear()
    if (this.page !== 'types') return

    TYPES.forEach((type, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = STATUS.x + 16 + column * TYPE_COL + TYPE_BAR_LEFT
      const y = TYPE_TOP + row * TYPE_GAP
      const value = this.state.types[type.key] ?? 0

      this.typeBars.fillStyle(0x0d0b1a, 0.85)
      this.typeBars.fillRect(x, y - 6, TYPE_BAR_WIDTH, 12)

      this.typeBars.fillStyle(type.color, 1)
      this.typeBars.fillRect(x, y - 6, TYPE_BAR_WIDTH * Math.min(1, value / TYPE_MAX), 12)

      this.typeBars.lineStyle(1, GOLD, 0.6)
      this.typeBars.strokeRect(x, y - 6, TYPE_BAR_WIDTH, 12)

      this.typeValues[index]?.setText(`${value}`)
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
