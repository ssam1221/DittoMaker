import Phaser from 'phaser'

import { cryPath } from '../audio/sfx'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { berryIconKey, BERRIES } from '../items'
import { HOST_NPCS, hostGreeting, npcArtKey, npcCryKey, npcPortraitKey } from '../npc'
import { ensureRaisingState, type RaisingState } from '../raising'
import type { SaveData } from '../save'
import { withJosa } from '../ui/hangul'
import { NpcTalk } from '../ui/npcTalk'
import { addChoice, drawParchmentFrame } from '../ui/panel'
import { ShopBox } from '../ui/shopBox'

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
  /**
   * 방향키를 눌렀을 때 갈 건물.
   *
   * 건물이 격자로 놓여 있지 않아 자리만 보고 자동으로 정하면 엉뚱한
   * 곳으로 튑니다. 그래서 네 방향을 하나씩 적어 둡니다.
   */
  left: string
  right: string
  up: string
  down: string
}

const PLACES: readonly Place[] = [
  {
    key: 'shop',
    name: '프렌들리숍',
    description: '먹을 것과 쓸 것을 파는 가게.',
    area: { x1: 265, y1: 165, x2: 570, y2: 360 },
    left: 'neighbour',
    right: 'gym',
    up: 'center',
    down: 'center',
  },
  {
    key: 'gym',
    name: '체육관',
    description: '겨루며 몸을 단련하는 곳.',
    // 오른쪽 깃발까지 품도록 넉넉히 잡습니다.
    area: { x1: 635, y1: 55, x2: 1040, y2: 345 },
    left: 'shop',
    right: 'neighbour',
    up: 'lab',
    down: 'lab',
  },
  {
    key: 'center',
    name: '포켓몬센터',
    description: '지친 포켓몬을 쉬게 하는 곳.',
    area: { x1: 245, y1: 400, x2: 545, y2: 645 },
    left: 'lab',
    right: 'lab',
    up: 'shop',
    down: 'shop',
  },
  {
    key: 'lab',
    name: '연구소',
    description: '지금 어떤 포켓몬에 가까워졌는지 살펴봐 준다.',
    area: { x1: 955, y1: 390, x2: 1205, y2: 605 },
    left: 'center',
    right: 'center',
    up: 'gym',
    down: 'gym',
  },
  {
    key: 'neighbour',
    name: '이웃집',
    description: '마을 사람과 이야기를 나눈다.',
    area: { x1: 1175, y1: 160, x2: 1450, y2: 335 },
    left: 'gym',
    right: 'shop',
    up: 'lab',
    down: 'lab',
  },
]

/**
 * 마을 화면. 그림 위의 건물을 골라 들어갑니다.
 * 건물 안은 아직 만들지 않았습니다.
 */
export class VillageScene extends Phaser.Scene {
  private save!: SaveData
  private state!: RaisingState
  private labels: Phaser.GameObjects.Text[] = []
  private frames: Phaser.GameObjects.Graphics[] = []
  private selected = 0

  private description!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text
  private notice?: Phaser.GameObjects.Text
  /** 건물 주인이 인사하는 동안 열려 있는 창 */
  private talk?: NpcTalk
  /** 프렌들리숍 진열대 */
  private shop?: ShopBox

  constructor() {
    super(SceneKey.Village)
  }

  init(data: SaveData): void {
    // 육아 상태를 그대로 들고 갔다가 돌아올 때 되돌려 줍니다.
    // 마을에서 산 것도 여기에 얹히므로 씬을 나갈 때 함께 돌려줍니다.
    this.save = data
    this.state = ensureRaisingState(data.raising)
  }

  preload(): void {
    this.load.image(TOWN_KEY, 'assets/background/town.png')

    // 건물 앞에서 맞아 주는 포켓몬들
    for (const npc of HOST_NPCS) {
      this.load.image(npcArtKey(npc.key), `assets/pokemon/npc/${npc.key}.png`)
      this.load.image(npcPortraitKey(npc.key), `assets/pokemon/portrait/npc/${npc.key}.png`)
      this.load.audio(npcCryKey(npc.key), cryPath(npc.cry))
    }

    // 프렌들리숍 진열대에 놓을 열매 아이콘
    for (const berry of BERRIES) {
      this.load.image(berryIconKey(berry.key), `assets/items/${berry.key}.png`)
    }
  }

  create(): void {
    this.labels = []
    this.frames = []
    this.selected = 0
    this.talk = undefined
    this.shop = undefined

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

    this.hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, '방향키 이동    Enter 들어가기    Esc 돌아가기', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#efe4c4',
      })
      .setOrigin(0.5, 0.5)
    this.hint.setStroke('#2e2416', 5)

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

    keyboard.on('keydown-LEFT', () => this.move('left'))
    keyboard.on('keydown-RIGHT', () => this.move('right'))
    keyboard.on('keydown-UP', () => this.move('up'))
    keyboard.on('keydown-DOWN', () => this.move('down'))
    keyboard.on('keydown-ENTER', () => this.submit())
    keyboard.on('keydown-SPACE', () => this.submit())
    keyboard.on('keydown-ESC', () => this.cancel())
  }

  private move(direction: 'left' | 'right' | 'up' | 'down'): void {
    if (this.shop) {
      if (direction === 'left') this.shop.move(-1, 'x')
      if (direction === 'right') this.shop.move(1, 'x')
      if (direction === 'up') this.shop.move(-1, 'y')
      if (direction === 'down') this.shop.move(1, 'y')
      return
    }

    // 인사를 듣는 중에는 마을을 돌아다닐 수 없습니다.
    if (this.talk) return

    const here = PLACES[this.selected]
    if (!here) return

    const next = PLACES.findIndex((place) => place.key === here[direction])
    if (next < 0) return

    this.selected = next
    this.refresh()
  }

  private submit(): void {
    if (this.shop) {
      this.shop.submit()
      return
    }

    if (this.talk) {
      this.talk.submit()
      return
    }

    this.enter(PLACES[this.selected]!)
  }

  private cancel(): void {
    if (this.shop) {
      this.shop.cancel()
      return
    }

    if (this.talk) {
      this.talk.cancel()
      return
    }

    this.leave()
  }

  /**
   * 건물에 들어갑니다. 안은 아직 없으므로 문 앞에서 주인이 인사만 합니다.
   * 주인이 없는 건물은 준비 중이라고 알립니다.
   */
  private enter(place: Place): void {
    if (this.talk) return

    const greeting = hostGreeting(place.key)
    if (!greeting) {
      this.showNotice(`${withJosa(place.name, '은', '는')} 아직 준비 중입니다`)
      return
    }

    this.notice?.destroy()
    this.notice = undefined

    // 인사하는 동안에는 마을 쪽 글자를 감춥니다. 대화창 아래로 비쳐 보입니다.
    this.showTownText(false)

    this.talk = new NpcTalk(
      this,
      [greeting],
      () => {
        this.talk = undefined
        this.openInside(place)
      },
      // 마을 그림을 가리지 않도록 작게, 오른쪽에 세웁니다.
      { artMaxHeight: 224, artX: GAME_WIDTH * 0.72 },
    )
  }

  /**
   * 인사가 끝난 뒤 건물 안에서 할 일.
   * 아직은 프렌들리숍에만 있고, 나머지는 마을로 되돌아옵니다.
   */
  private openInside(place: Place): void {
    if (place.key !== 'shop') {
      this.showTownText(true)
      return
    }

    this.shop = new ShopBox(this, {
      name: this.save.dittoName,
      state: this.state,
      onBuy: (state) => {
        this.state = state
      },
      onCancel: () => {
        this.shop = undefined
        this.showTownText(true)
      },
    })
  }

  private showTownText(visible: boolean): void {
    this.description.setVisible(visible)
    this.hint.setVisible(visible)
    this.labels.forEach((label) => label.setVisible(visible))
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
      this.scene.start(SceneKey.Raising, { ...this.save, raising: this.state })
    })
  }
}
