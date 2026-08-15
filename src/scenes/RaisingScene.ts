import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { AudioKey, FontFamily, GAME_HEIGHT, GAME_WIDTH, MusicFile, SceneKey } from '../constants'
import {
  ageInMonths,
  conditionLabel,
  dateOf,
  ensureRaisingState,
  rest,
  SEASON_LABELS,
  seasonOf,
  STAT_LABELS,
  type Season,
  TYPE_MAX,
  TYPES,
  type RaisingState,
} from '../raising'
import { writeSlot, type SaveData } from '../save'
import { addChoice, drawParchmentFrame, GOLD, GOLD_LIGHT } from '../ui/panel'
import { openMenu, type MenuPopup } from '../ui/menuPopup'
import { drawWindowView } from '../ui/window'

const DITTO_KEY = '0132-메타몽'

/** 위쪽 날짜·소지금 띠 */
const HEADER = { x: 20, y: 16, width: GAME_WIDTH - 40, height: 36 }

/** 메타몽이 있는 방 */
const ROOM = { x: 20, y: 64, width: 570, height: 386 }

/** 창문. 계절에 따라 안쪽 풍경만 다시 그립니다. */
const WINDOW = { x: 76, y: 100, width: 168, height: 120 }

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
  private windowView!: Phaser.GameObjects.Graphics
  /** 지금 창밖에 그려져 있는 계절 */
  private drawnSeason?: Season
  private notice?: Phaser.GameObjects.Text

  /** 일정 창이 떠 있는 동안에는 뒤쪽 조작을 막습니다. */
  private popup?: MenuPopup

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
    // Phaser 는 씬 인스턴스를 다시 씁니다. 여기서 비우지 않으면 지난번에
    // 파괴된 오브젝트가 배열에 남아, 다시 들어올 때 그것들을 만지다 터집니다.
    this.statValues = []
    this.typeValues = []
    this.statsPage = []
    this.typesPage = []
    this.tabs = []
    this.buttons = []
    this.selected = 0
    // 이 값이 남아 있으면 다시 들어왔을 때 창밖을 그리지 않고 넘어갑니다.
    this.drawnSeason = undefined
    // 창을 띄운 채 화면을 벗어났다면 그 흔적이 남아 조작이 잠깁니다.
    this.popup = undefined

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
    const floorY = ROOM.y + ROOM.height * 0.62

    this.drawWalls(floorY)

    // 창밖 풍경은 계절이 바뀌면 다시 그려야 하므로 따로 둡니다.
    this.windowView = this.add.graphics()
    this.drawWindowFrame()

    this.drawWallDecor()
    this.drawFloorDecor(floorY)

    const ditto = this.add.image(ROOM.x + ROOM.width * 0.55, floorY + 34, DITTO_KEY)
    ditto.setScale(180 / ditto.height)

    this.tweens.add({
      targets: ditto,
      scaleX: ditto.scaleX * 1.05,
      scaleY: ditto.scaleY * 0.95,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // 방 테두리는 안에 놓인 것들 위에 그려야 깔끔하게 잘립니다.
    const border = this.add.graphics()
    border.lineStyle(3, GOLD, 1)
    border.strokeRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height)
    border.lineStyle(1, GOLD_LIGHT, 0.8)
    border.strokeRect(ROOM.x + 5, ROOM.y + 5, ROOM.width - 10, ROOM.height - 10)
  }

  /** 벽지와 바닥, 그리고 둘이 만나는 굽도리 */
  private drawWalls(floorY: number): void {
    const g = this.add.graphics()

    g.fillStyle(0x3a4070, 1)
    g.fillRect(ROOM.x, ROOM.y, ROOM.width, floorY - ROOM.y)

    // 벽지 줄무늬 — 벽이 밋밋해 보이지 않을 만큼만 옅게 넣습니다.
    g.fillStyle(0xffffff, 0.04)
    for (let x = ROOM.x + 14; x < ROOM.x + ROOM.width; x += 28) {
      g.fillRect(x, ROOM.y, 12, floorY - ROOM.y)
    }

    g.fillStyle(0x6b5a48, 1)
    g.fillRect(ROOM.x, floorY, ROOM.width, ROOM.y + ROOM.height - floorY)

    // 마룻바닥 결
    g.lineStyle(1, 0x000000, 0.14)
    for (let y = floorY + 18; y < ROOM.y + ROOM.height; y += 22) {
      g.lineBetween(ROOM.x, y, ROOM.x + ROOM.width, y)
    }

    g.fillStyle(0x8a7a62, 1)
    g.fillRect(ROOM.x, floorY - 10, ROOM.width, 10)
  }

  private drawWindowFrame(): void {
    const g = this.add.graphics()

    // 창틀은 풍경 위에 얹습니다.
    g.lineStyle(5, 0x8a7a62, 1)
    g.strokeRect(WINDOW.x, WINDOW.y, WINDOW.width, WINDOW.height)
    g.lineStyle(3, 0x8a7a62, 1)
    g.lineBetween(
      WINDOW.x + WINDOW.width / 2,
      WINDOW.y,
      WINDOW.x + WINDOW.width / 2,
      WINDOW.y + WINDOW.height,
    )
    g.lineBetween(
      WINDOW.x,
      WINDOW.y + WINDOW.height / 2,
      WINDOW.x + WINDOW.width,
      WINDOW.y + WINDOW.height / 2,
    )

    // 창턱
    g.fillStyle(0x8a7a62, 1)
    g.fillRect(WINDOW.x - 8, WINDOW.y + WINDOW.height, WINDOW.width + 16, 7)
  }

  private drawWallDecor(): void {
    const g = this.add.graphics()

    // 액자 — 아르세우스를 만난 밤을 담아 둔 그림
    const frame = { x: ROOM.x + 268, y: ROOM.y + 52, w: 84, h: 64 }
    g.fillStyle(0x8a7a62, 1)
    g.fillRect(frame.x - 4, frame.y - 4, frame.w + 8, frame.h + 8)
    g.fillStyle(0x141026, 1)
    g.fillRect(frame.x, frame.y, frame.w, frame.h)
    g.fillStyle(0xffffff, 0.9)
    for (const [fx, fy] of [
      [0.2, 0.3],
      [0.5, 0.2],
      [0.72, 0.44],
      [0.35, 0.62],
      [0.85, 0.7],
    ] as ReadonlyArray<readonly [number, number]>) {
      g.fillCircle(frame.x + frame.w * fx, frame.y + frame.h * fy, 1.4)
    }
    g.fillStyle(0xf0e6c8, 1)
    g.fillCircle(frame.x + frame.w * 0.6, frame.y + frame.h * 0.5, 5)

    // 선반과 그 위의 물건들
    const shelfY = ROOM.y + 96
    g.fillStyle(0x8a7a62, 1)
    g.fillRect(ROOM.x + 400, shelfY, 132, 8)

    // 약병 둘
    g.fillStyle(0xe06666, 1)
    g.fillRect(ROOM.x + 414, shelfY - 26, 14, 26)
    g.fillStyle(0xd8cdb8, 1)
    g.fillRect(ROOM.x + 416, shelfY - 32, 10, 7)

    g.fillStyle(0x6bb8e0, 1)
    g.fillRect(ROOM.x + 438, shelfY - 20, 12, 20)
    g.fillStyle(0xd8cdb8, 1)
    g.fillRect(ROOM.x + 440, shelfY - 25, 8, 6)

    // 책 세 권
    for (const [offset, height, color] of [
      [472, 30, 0x8a6fbf],
      [482, 26, 0xd8a03f],
      [492, 32, 0x5fa36b],
    ] as ReadonlyArray<readonly [number, number, number]>) {
      g.fillStyle(color, 1)
      g.fillRect(ROOM.x + offset, shelfY - height, 8, height)
    }

    // 벽에 걸린 시계
    const clock = { x: ROOM.x + 520, y: ROOM.y + 46 }
    g.fillStyle(0x8a7a62, 1)
    g.fillCircle(clock.x, clock.y, 19)
    g.fillStyle(0xf0e6c8, 1)
    g.fillCircle(clock.x, clock.y, 15)
    g.lineStyle(2, 0x3a3020, 1)
    g.lineBetween(clock.x, clock.y, clock.x, clock.y - 9)
    g.lineBetween(clock.x, clock.y, clock.x + 7, clock.y + 3)
  }

  private drawFloorDecor(floorY: number): void {
    const g = this.add.graphics()

    // 깔개
    g.fillStyle(0x7a5a8a, 0.75)
    g.fillEllipse(ROOM.x + ROOM.width * 0.55, floorY + 92, 320, 96)
    g.fillStyle(0x9a76a8, 0.5)
    g.fillEllipse(ROOM.x + ROOM.width * 0.55, floorY + 92, 240, 68)

    // 왼쪽 협탁과 등불
    const table = { x: ROOM.x + 44, y: floorY + 26, w: 84, h: 54 }
    g.fillStyle(0x7a6248, 1)
    g.fillRect(table.x, table.y, table.w, table.h)
    g.fillStyle(0x5e4a36, 1)
    g.fillRect(table.x, table.y, table.w, 8)

    g.fillStyle(0x4a3f34, 1)
    g.fillRect(table.x + 36, table.y - 16, 8, 16)
    g.fillStyle(0xf0d78a, 1)
    g.fillTriangle(
      table.x + 40,
      table.y - 44,
      table.x + 18,
      table.y - 16,
      table.x + 62,
      table.y - 16,
    )
    // 등불 빛. 한 겹으로 칠하면 원판처럼 보여서, 옅게 여러 겹 겹칩니다.
    for (const [radius, alpha] of [
      [54, 0.05],
      [40, 0.06],
      [26, 0.08],
      [14, 0.1],
    ] as ReadonlyArray<readonly [number, number]>) {
      g.fillStyle(0xffe9a8, alpha)
      g.fillCircle(table.x + 40, table.y - 26, radius)
    }

    // 오른쪽 화분
    const pot = { x: ROOM.x + 494, y: floorY + 74 }
    g.fillStyle(0x5fa36b, 1)
    g.fillEllipse(pot.x, pot.y - 34, 54, 46)
    g.fillEllipse(pot.x - 18, pot.y - 20, 34, 30)
    g.fillEllipse(pot.x + 18, pot.y - 22, 30, 28)
    g.fillStyle(0xb0714a, 1)
    g.fillRect(pot.x - 20, pot.y - 6, 40, 30)
    g.fillStyle(0xc98a5e, 1)
    g.fillRect(pot.x - 24, pot.y - 10, 48, 8)

    // 굴러다니는 공
    const ball = { x: ROOM.x + 176, y: floorY + 108 }
    g.fillStyle(0xe05a5a, 1)
    g.fillCircle(ball.x, ball.y, 13)
    g.fillStyle(0xf2ede2, 1)
    g.fillRect(ball.x - 13, ball.y, 26, 13)
    g.fillStyle(0x3a3020, 1)
    g.fillRect(ball.x - 13, ball.y - 2, 26, 4)
    g.fillStyle(0xf2ede2, 1)
    g.fillCircle(ball.x, ball.y, 4)
    g.lineStyle(2, 0x3a3020, 1)
    g.strokeCircle(ball.x, ball.y, 4)
    g.strokeCircle(ball.x, ball.y, 13)
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
      { label: '일정', run: () => this.openSchedule() },
      { label: '마을', run: () => this.goVillage() },
      { label: '대화', run: () => this.notImplemented('대화') },
      // 휴식은 이번 주에 무엇을 할지 고르는 일정 창 안에 있습니다.
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

    // 일정 창이 떠 있으면 그쪽이 키를 가져갑니다.
    keyboard.on('keydown-UP', () => this.popup?.move(-1))
    keyboard.on('keydown-DOWN', () => this.popup?.move(1))

    keyboard.on('keydown-LEFT', () => {
      if (!this.popup) this.move(-1)
    })
    keyboard.on('keydown-RIGHT', () => {
      if (!this.popup) this.move(1)
    })

    const activate = (): void => {
      if (this.popup) {
        this.popup.submit()
        return
      }
      this.commands[this.selected]?.run()
    }
    keyboard.on('keydown-ENTER', activate)
    keyboard.on('keydown-SPACE', activate)

    keyboard.on('keydown-ESC', () => {
      if (this.popup) {
        this.popup.cancel()
        return
      }
      this.scene.start(SceneKey.Menu)
    })

    // 오른쪽 판을 능력치 / 타입 사이에서 넘깁니다.
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault()
      if (this.popup) return
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

  /** 이번 주에 무엇을 할지 고르는 창 */
  private openSchedule(): void {
    if (this.popup) return

    this.popup = openMenu(this, {
      title: '이번 주 일정',
      items: [
        { label: '훈련시키기', run: () => this.afterPopup(() => this.notImplemented('훈련')) },
        { label: '일시키기', run: () => this.afterPopup(() => this.notImplemented('일')) },
        { label: '모험', run: () => this.afterPopup(() => this.notImplemented('모험')) },
        { label: '휴식', run: () => this.afterPopup(() => this.doRest()) },
        { label: '뒤로', run: () => this.afterPopup(() => undefined) },
      ],
      onCancel: () => {
        this.popup = undefined
      },
    })
  }

  /** 창이 닫힌 뒤에 실행합니다. 창 상태를 먼저 비워야 조작이 다시 살아납니다. */
  private afterPopup(run: () => void): void {
    this.popup = undefined
    run()
  }

  /** 지금까지의 진행을 들고 마을로 나갑니다. 돌아오면 그대로 이어집니다. */
  private goVillage(): void {
    this.cameras.main.fadeOut(250, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Village, { ...this.save, raising: this.state })
    })
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
    const season = seasonOf(date.month)

    this.dateText.setText(
      `${date.year}년 ${date.month}월 ${date.week}주차   ·   ${SEASON_LABELS[season]}`,
    )

    // 계절이 넘어갔을 때만 창밖을 다시 그립니다.
    if (season !== this.drawnSeason) {
      this.drawnSeason = season
      drawWindowView(this.windowView, WINDOW, season)
    }
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
