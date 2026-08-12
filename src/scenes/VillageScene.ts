import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import type { SaveData } from '../save'
import { addChoice, drawParchmentFrame, GOLD } from '../ui/panel'

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

/** 건물이 서 있는 땅의 높이 */
const GROUND_Y = 372
const BUILDING_Y = 316

interface Place {
  key: string
  name: string
  description: string
  /** 지붕 색 — 건물을 한눈에 구분하는 표시입니다. */
  roof: number
  wall: number
  x: number
}

const PLACES: readonly Place[] = [
  {
    key: 'center',
    name: '포켓몬센터',
    description: '지친 포켓몬을 쉬게 하는 곳.',
    roof: 0xe05a5a,
    wall: 0xf2ede2,
    x: 200,
  },
  {
    key: 'shop',
    name: '프렌들리숍',
    description: '먹을 것과 쓸 것을 파는 가게.',
    roof: 0x4a86d8,
    wall: 0xf2ede2,
    x: 480,
  },
  {
    key: 'gym',
    name: '체육관',
    description: '겨루며 몸을 단련하는 곳.',
    roof: 0x8a8f9c,
    wall: 0xd8cdb8,
    x: 760,
  },
]

/**
 * 마을 화면. 지금은 갈 수 있는 곳만 세워 두었습니다.
 * 각 건물 안은 아직 만들지 않았습니다.
 */
export class VillageScene extends Phaser.Scene {
  private save!: SaveData
  private labels: Phaser.GameObjects.Text[] = []
  private highlights: Phaser.GameObjects.Graphics[] = []
  private selected = 0

  private description!: Phaser.GameObjects.Text
  private notice?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Village)
  }

  init(data: SaveData): void {
    // 육성 상태를 그대로 들고 갔다가 돌아올 때 되돌려 줍니다.
    this.save = data
  }

  create(): void {
    this.labels = []
    this.highlights = []
    this.selected = 0

    drawParchmentFrame(this)
    this.createSky()

    this.add
      .text(GAME_WIDTH / 2, 34, '마  을', {
        fontFamily: FontFamily.Body,
        fontSize: '30px',
        color: '#4a3a1c',
      })
      .setOrigin(0.5, 0)

    PLACES.forEach((place, index) => this.createBuilding(place, index))

    this.description = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 92, '', {
        fontFamily: FontFamily.Body,
        fontSize: '19px',
        color: '#5a4a28',
      })
      .setOrigin(0.5, 0.5)

    addChoice(this, GAME_WIDTH / 2, GAME_HEIGHT - 54, '돌아가기', () => this.leave(), {
      fontSize: '22px',
      color: COLOR_IDLE,
      onFocus: () => undefined,
    }).setColor('#6b5a34')

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, '← → 이동    Enter 들어가기    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5, 1)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  /** 하늘과 땅. 건물이 허공에 뜨지 않도록 바닥을 깝니다. */
  private createSky(): void {
    const g = this.add.graphics()

    g.fillStyle(0x9fd0e8, 1)
    g.fillRect(24, 70, GAME_WIDTH - 48, GROUND_Y - 70)

    // 멀리 보이는 언덕. 판 아래로 삐져나가지 않도록 납작하게 눌러 둡니다.
    g.fillStyle(0x7fb069, 0.55)
    g.fillEllipse(240, GROUND_Y + 8, 420, 80)
    g.fillEllipse(700, GROUND_Y + 12, 460, 72)

    g.fillStyle(0x6f9e5c, 1)
    g.fillRect(24, GROUND_Y, GAME_WIDTH - 48, GAME_HEIGHT - 120 - GROUND_Y)

    // 구름
    g.fillStyle(0xffffff, 0.85)
    for (const [x, y, r] of [
      [140, 130, 18],
      [166, 124, 24],
      [196, 132, 16],
      [700, 112, 16],
      [726, 106, 22],
      [752, 114, 15],
    ] as ReadonlyArray<readonly [number, number, number]>) {
      g.fillCircle(x, y, r)
    }

    g.lineStyle(3, GOLD, 1)
    g.strokeRect(24, 70, GAME_WIDTH - 48, GAME_HEIGHT - 190)
  }

  private createBuilding(place: Place, index: number): void {
    const width = 168
    const height = 118
    const left = place.x - width / 2
    const top = BUILDING_Y - height

    const g = this.add.graphics()

    // 벽
    g.fillStyle(place.wall, 1)
    g.fillRect(left, top, width, height)

    // 지붕 — 벽보다 조금 넓게 빼서 처마를 만듭니다.
    g.fillStyle(place.roof, 1)
    g.fillTriangle(left - 14, top, place.x, top - 46, left + width + 14, top)

    // 문과 창
    g.fillStyle(0x4a3f34, 1)
    g.fillRect(place.x - 22, BUILDING_Y - 52, 44, 52)
    g.fillStyle(0x8fd0e8, 1)
    g.fillRect(left + 18, top + 26, 34, 28)
    g.fillRect(left + width - 52, top + 26, 34, 28)

    g.lineStyle(2, 0x4a3f34, 0.7)
    g.strokeRect(left, top, width, height)

    // 문 위 간판
    g.fillStyle(place.roof, 1)
    g.fillRect(place.x - 34, top - 4, 68, 12)

    // 고른 건물을 감싸는 테두리
    const highlight = this.add.graphics()
    highlight.lineStyle(3, 0xffd447, 1)
    highlight.strokeRect(left - 20, top - 52, width + 40, height + 52)
    this.highlights.push(highlight)

    const label = addChoice(
      this,
      place.x,
      BUILDING_Y + 26,
      place.name,
      () => {
        this.selected = index
        this.refresh()
        this.enter(place)
      },
      {
        fontSize: '20px',
        color: COLOR_IDLE,
        onFocus: () => {
          this.selected = index
          this.refresh()
        },
      },
    )
    label.setStroke('#2e2416', 5)
    this.labels.push(label)
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-LEFT', () => this.move(-1))
    keyboard.on('keydown-RIGHT', () => this.move(1))
    keyboard.on('keydown-ENTER', () => this.enter(PLACES[this.selected]!))
    keyboard.on('keydown-SPACE', () => this.enter(PLACES[this.selected]!))
    keyboard.on('keydown-ESC', () => this.leave())
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + PLACES.length) % PLACES.length
    this.refresh()
  }

  private enter(place: Place): void {
    this.showNotice(`${place.name}은 아직 준비 중입니다`)
  }

  private refresh(): void {
    this.labels.forEach((label, index) => {
      label.setColor(index === this.selected ? COLOR_SELECTED : COLOR_IDLE)
    })
    this.highlights.forEach((highlight, index) => {
      highlight.setVisible(index === this.selected)
    })

    this.description.setText(PLACES[this.selected]?.description ?? '')
  }

  private showNotice(message: string): void {
    this.notice?.destroy()

    const notice = this.add.text(GAME_WIDTH / 2, GROUND_Y + 42, message, {
      fontFamily: FontFamily.Body,
      fontSize: '19px',
      color: '#fff0b8',
    })
    notice.setOrigin(0.5, 0.5)
    notice.setStroke('#2e2416', 5)
    this.notice = notice

    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 1400,
      duration: 500,
      onComplete: () => notice.destroy(),
    })
  }

  private leave(): void {
    this.cameras.main.fadeOut(250, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Raising, this.save)
    })
  }
}
