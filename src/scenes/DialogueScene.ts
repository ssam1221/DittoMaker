import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { cryPath, playSfx } from '../audio/sfx'
import { AudioKey, FontFamily, GAME_HEIGHT, GAME_WIDTH, MusicFile, SceneKey } from '../constants'
import type { SaveData } from '../save'
import { withJosa } from '../ui/hangul'
import { createPokemonFrame } from '../ui/pokemonFrame'

const ARCEUS = { no: 493, file: '0493-아르세우스' }
const DITTO = { no: 132, file: '0132-메타몽' }

/** 울음소리 키 — 그림 키와 겹치지 않게 접두사를 붙입니다. */
const cryKey = (file: string): string => `cry-${file}`

const INFO_KEY = 'pokemon-info'
const SPACE_KEY = 'space'
const PORTRAIT_KEY = 'speaker-portrait'

/** 대화창 영역 */
const BOX = {
  x: 24,
  y: 336,
  width: GAME_WIDTH - 48,
  height: GAME_HEIGHT - 336 - 24,
}

const PORTRAIT_SIZE = 116
const PORTRAIT_X = BOX.x + 18 + PORTRAIT_SIZE / 2
const PORTRAIT_Y = BOX.y + 14 + PORTRAIT_SIZE / 2
const TEXT_LEFT = BOX.x + PORTRAIT_SIZE + 44

/** 한 글자를 찍는 간격 */
const TYPE_MS = 45

interface Line {
  text: string
  /** 이 줄에서 메타몽이 나타납니다 */
  revealDitto?: boolean
}

interface PokemonInfo {
  no: number
  name: string
}

/**
 * 공을 세운 이에게 아르세우스가 메타몽을 맡기는 첫 장면입니다.
 * 캐릭터 설정에서 받은 성과 이름을 그대로 불러 씁니다.
 */
function buildScript(save: SaveData | undefined): Line[] {
  const surname = save?.surname?.trim() || '그대'
  const dittoName = save?.dittoName?.trim() || '이 아이'
  const called = withJosa(surname, '이여', '여')

  return [
    { text: '…눈을 떴는가, 사람의 아이여.' },
    { text: '나는 아르세우스. 이 세계의 처음을 지켜본 자다.' },
    { text: `${called}. 그대가 걸어온 길을 나는 모두 보았다.` },
    { text: '무너지는 세계의 끝에서, 그대만이 끝내 등을 돌리지 않았지.' },
    { text: '그 공에 답하여, 내 그대에게 하나를 맡기려 한다.', revealDitto: true },
    { text: '이 아이에게는 정해진 모습이 없다.' },
    { text: '무엇이든 될 수 있다는 것은, 아직 아무것도 아니라는 뜻이기도 하다.' },
    { text: `${dittoName}. 그대가 지어 준 이름이다. 오늘부터 이 아이는 그 이름으로 살아간다.` },
    { text: '먹이고, 가르치고, 함께 걸어라. 그대가 보여 주는 것이 곧 이 아이의 모습이 된다.' },
    { text: '열 해 뒤 이 아이가 무엇이 되어 있을지는, 나조차 알지 못한다.' },
    { text: '그것만은 오직 그대의 손에 달렸다.' },
    { text: `가거라, ${called}. 무엇이 되든 — 이 아이는 그대가 길러낸 아이다.` },
  ]
}

export class DialogueScene extends Phaser.Scene {
  private save?: SaveData
  private script: Line[] = []
  private index = 0

  private line!: Phaser.GameObjects.Text
  private marker?: Phaser.GameObjects.Text
  private ditto?: Phaser.GameObjects.Image
  private typing?: Phaser.Time.TimerEvent
  /** 지금 줄을 다 찍었는지 */
  private settled = false

  constructor() {
    super(SceneKey.Dialogue)
  }

  init(data: SaveData): void {
    // 슬롯에서 불러왔거나 방금 만든 값. 없이 들어오면 일반 표현으로 진행합니다.
    this.save = data?.surname ? data : undefined
  }

  preload(): void {
    this.load.image(SPACE_KEY, 'assets/background/space.png')
    this.load.image(ARCEUS.file, `assets/pokemon/artwork/${ARCEUS.file}.png`)
    this.load.image(DITTO.file, `assets/pokemon/artwork/${DITTO.file}.png`)
    // 대화창에는 얼굴만 잘라 둔 초상화를 씁니다. 전신을 축소해 넣으면
    // 작은 틀 안에서 표정이 보이지 않습니다.
    this.load.image(PORTRAIT_KEY, `assets/pokemon/portrait/${ARCEUS.file}.png`)
    this.load.json(INFO_KEY, 'data/pokemon-info.json')

    this.load.audio(cryKey(ARCEUS.file), cryPath(ARCEUS.file))
    this.load.audio(cryKey(DITTO.file), cryPath(DITTO.file))

    // 5MB 가 넘어서 부팅 때 받지 않고 이 씬에 들어올 때 받습니다.
    // 파일명에 공백이 있어 URL 로 안전하게 바꿔 넘깁니다.
    this.load.audio(AudioKey.Coronet, `music/${encodeURIComponent(MusicFile.Coronet)}`)
  }

  create(): void {
    this.script = buildScript(this.save)
    this.index = 0

    this.cameras.main.setBackgroundColor('#1b1730')
    playBgm(this, AudioKey.Coronet)

    this.createStage()
    this.createBox()
    this.bindInput()

    // 말을 꺼내는 순간에 맞춰 한 번 웁니다.
    playSfx(this, cryKey(ARCEUS.file))

    this.showLine()
    this.cameras.main.fadeIn(600, 0, 0, 0)
  }

  /** 우주 배경과 그 앞에 뜬 아르세우스 */
  private createStage(): void {
    const space = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, SPACE_KEY)
    space.setScale(Math.max(GAME_WIDTH / space.width, GAME_HEIGHT / space.height))

    const artwork = this.add.image(GAME_WIDTH / 2 - 40, (BOX.y - 20) / 2 + 10, ARCEUS.file)
    const maxHeight = BOX.y - 60
    artwork.setScale(Math.min(maxHeight / artwork.height, 1))

    // 우주에 떠 있는 느낌으로 천천히 위아래로 움직입니다.
    this.tweens.add({
      targets: artwork,
      y: artwork.y - 12,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createBox(): void {
    const box = this.add.graphics()
    box.fillStyle(0x0d0b1a, 0.92)
    box.fillRoundedRect(BOX.x, BOX.y, BOX.width, BOX.height, 14)
    box.lineStyle(3, 0x6b5ea8, 1)
    box.strokeRoundedRect(BOX.x, BOX.y, BOX.width, BOX.height, 14)

    createPokemonFrame(this, PORTRAIT_X, PORTRAIT_Y, PORTRAIT_KEY, {
      size: PORTRAIT_SIZE,
      shape: 'rounded',
      background: 0x241f3d,
      ring: 0x8f7fd4,
      ringWidth: 3,
      padding: 6,
    })

    this.add
      .text(PORTRAIT_X, PORTRAIT_Y + PORTRAIT_SIZE / 2 + 16, this.speakerName(), {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#ffd447',
      })
      .setOrigin(0.5, 0)

    this.line = this.add.text(TEXT_LEFT, BOX.y + 24, '', {
      fontFamily: FontFamily.Body,
      fontSize: '23px',
      color: '#f3efff',
      wordWrap: { width: BOX.x + BOX.width - TEXT_LEFT - 28 },
      lineSpacing: 10,
    })
  }

  private speakerName(): string {
    const list = this.cache.json.get(INFO_KEY) as PokemonInfo[] | undefined
    return list?.find((p) => p.no === ARCEUS.no)?.name ?? '아르세우스'
  }

  private bindInput(): void {
    const advance = (): void => this.advance()

    this.input.keyboard!.on('keydown-ENTER', advance)
    this.input.keyboard!.on('keydown-SPACE', advance)
    this.input.on(Phaser.Input.Events.POINTER_DOWN, advance)
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start(SceneKey.Menu))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.typing?.remove())
  }

  /**
   * 한 번 누르면 찍는 중이던 줄을 즉시 끝내고,
   * 이미 끝나 있으면 다음 줄로 넘어갑니다.
   */
  private advance(): void {
    if (!this.settled) {
      this.finishLine()
      return
    }

    // 마지막 줄에서 한 번 더 누르면 육성이 시작됩니다.
    if (this.index >= this.script.length - 1) {
      this.startRaising()
      return
    }

    this.index += 1
    this.showLine()
  }

  private startRaising(): void {
    this.typing?.remove()
    this.cameras.main.fadeOut(700, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Raising, this.save)
    })
  }

  private showLine(): void {
    const line = this.script[this.index]
    if (!line) return

    this.typing?.remove()
    this.marker?.setVisible(false)
    this.settled = false
    this.line.setText('')

    if (line.revealDitto) this.revealDitto()

    let shown = 0
    this.typing = this.time.addEvent({
      delay: TYPE_MS,
      repeat: line.text.length - 1,
      callback: () => {
        shown += 1
        this.line.setText(line.text.slice(0, shown))
        if (shown === line.text.length) this.settleLine()
      },
    })
  }

  private finishLine(): void {
    const line = this.script[this.index]
    if (!line) return

    this.typing?.remove()
    this.line.setText(line.text)
    this.settleLine()
  }

  private settleLine(): void {
    this.settled = true

    if (!this.marker) {
      this.marker = this.add.text(BOX.x + BOX.width - 30, BOX.y + BOX.height - 30, '▼', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#8f7fd4',
      })
      this.marker.setOrigin(1, 1)

      this.tweens.add({
        targets: this.marker,
        alpha: 0.2,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    this.marker.setVisible(true)
  }

  /** 아르세우스 곁에 메타몽이 내려앉습니다. */
  private revealDitto(): void {
    if (this.ditto) return

    const ditto = this.add.image(GAME_WIDTH / 2 + 210, 150, DITTO.file)
    ditto.setScale((BOX.y - 60) / ditto.height / 2.4)
    ditto.setAlpha(0)
    this.ditto = ditto

    // 나타나면서 저도 한 번 웁니다.
    playSfx(this, cryKey(DITTO.file))

    this.tweens.add({
      targets: ditto,
      alpha: 1,
      y: 214,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // 자리를 잡고 나면 말랑이답게 조금씩 흔들립니다.
        this.tweens.add({
          targets: ditto,
          scaleX: ditto.scaleX * 1.05,
          scaleY: ditto.scaleY * 0.95,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      },
    })
  }
}
