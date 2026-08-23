import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import type { SaveData } from '../save'
import { withJosa } from '../ui/hangul'
import { addChoice, drawParchmentFrame } from '../ui/panel'

const TOWN_KEY = 'town'

/** 그림 원본 크기. 자리 지정은 이 좌표계로 적고 화면 크기에 맞춰 환산합니다. */
const IMAGE = { width: 1672, height: 941 }

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'

interface Place {
  key: string
  name: string
  description: string
  /** 그림 위에서 그 건물이 차지하는 자리 (원본 픽셀) */
  area: { x1: number; y1: number; x2: number; y2: number }
  ready?: boolean
}

const PLACES: readonly Place[] = [
  {
    key: 'shop',
    name: '프렌들리숍',
    description: '먹을 것과 쓸 것을 파는 가게.',
    area: { x1: 265, y1: 165, x2: 570, y2: 360 },
  },
  {
    key: 'gym',
    name: '체육관',
    description: '겨루며 몸을 단련하는 곳.',
    area: { x1: 635, y1: 55, x2: 995, y2: 345 },
  },
  {
    key: 'center',
    name: '포켓몬센터',
    description: '지친 포켓몬을 쉬게 하는 곳.',
    area: { x1: 245, y1: 400, x2: 545, y2: 645 },
  },
  {
    key: 'lab',
    name: '연구소',
    description: '지금 어떤 포켓몬에 가까워졌는지 살펴봐 준다.',
    area: { x1: 955, y1: 390, x2: 1205, y2: 605 },
  },
  {
    key: 'neighbour',
    name: '이웃집',
    description: '마을 사람과 이야기를 나눈다.',
    area: { x1: 1175, y1: 160, x2: 1450, y2: 335 },
  },
]

/**
 * 마을 화면. 그림 위의 건물을 골라 들어갑니다.
 * 건물 안은 아직 만들지 않았습니다.
 */
export class VillageScene extends Phaser.Scene {
  private save!: SaveData
  private labels: Phaser.GameObjects.Text[] = []
  private frames: Phaser.GameObjects.Graphics[] = []
  private selected = 0

  private description!: Phaser.GameObjects.Text
  private notice?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Village)
  }

  init(data: SaveData): void {
    // 육아 상태를 그대로 들고 갔다가 돌아올 때 되돌려 줍니다.
    this.save = data
  }

  preload(): void {
    this.load.image(TOWN_KEY, 'assets/background/town.png')
  }

  create(): void {
    this.labels = []
    this.frames = []
    this.selected = 0

    drawParchmentFrame(this)
    this.createTown()

    PLACES.forEach((place, index) => this.createPlace(place, index))

    this.description = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 44, '', {
        fontFamily: FontFamily.Body,
        fontSize: '18px',
        color: '#fff0b8',
      })
      .setOrigin(0.5, 0.5)
    this.description.setStroke('#2e2416', 5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '방향키 이동    Enter 들어가기    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#efe4c4',
      })
      .setOrigin(0.5, 0.5)
      .setStroke('#2e2416', 5)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  /** 마을 그림. 화면 비율이 그림과 거의 같아 그대로 덮습니다. */
  private createTown(): void {
    const town = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TOWN_KEY)
    town.setScale(Math.max(GAME_WIDTH / town.width, GAME_HEIGHT / town.height))

    // 아래쪽에 글자가 앉을 자리를 어둡게 깔아 읽히게 합니다.
    const shade = this.add.graphics()
    shade.fillStyle(0x000000, 0.45)
    shade.fillRect(0, GAME_HEIGHT - 66, GAME_WIDTH, 66)
  }

  private createPlace(place: Place, index: number): void {
    const scaleX = GAME_WIDTH / IMAGE.width
    const scaleY = GAME_HEIGHT / IMAGE.height

    const x = place.area.x1 * scaleX
    const y = place.area.y1 * scaleY
    const width = (place.area.x2 - place.area.x1) * scaleX
    const height = (place.area.y2 - place.area.y1) * scaleY

    // 고른 건물을 감싸는 테두리
    const frame = this.add.graphics()
    frame.lineStyle(3, 0xffd447, 1)
    frame.strokeRect(x, y, width, height)
    this.frames.push(frame)

    const label = addChoice(
      this,
      x + width / 2,
      y + height + 10,
      place.name,
      () => {
        this.selected = index
        this.refresh()
        this.enter(place)
      },
      {
        fontSize: '17px',
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
    keyboard.on('keydown-UP', () => this.move(-1))
    keyboard.on('keydown-DOWN', () => this.move(1))
    keyboard.on('keydown-ENTER', () => this.enter(PLACES[this.selected]!))
    keyboard.on('keydown-SPACE', () => this.enter(PLACES[this.selected]!))
    keyboard.on('keydown-ESC', () => this.leave())
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + PLACES.length) % PLACES.length
    this.refresh()
  }

  private enter(place: Place): void {
    this.showNotice(`${withJosa(place.name, '은', '는')} 아직 준비 중입니다`)
  }

  private refresh(): void {
    this.labels.forEach((label, index) => {
      label.setColor(index === this.selected ? COLOR_SELECTED : COLOR_IDLE)
    })
    this.frames.forEach((frame, index) => {
      frame.setVisible(index === this.selected)
    })

    this.description.setText(PLACES[this.selected]?.description ?? '')
  }

  private showNotice(message: string): void {
    this.notice?.destroy()

    const notice = this.add.text(GAME_WIDTH / 2, 30, message, {
      fontFamily: FontFamily.Body,
      fontSize: '19px',
      color: '#fff0b8',
    })
    notice.setOrigin(0.5, 0.5)
    notice.setStroke('#2e2416', 6)
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
