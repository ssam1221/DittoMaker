import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { AudioKey, FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { createPokemonFrame } from '../ui/pokemonFrame'

/** 지금 화면에 세울 포켓몬 */
const SPEAKER = {
  no: 493,
  file: '0493-아르세우스',
  line: '안녕하세요',
  /** 이 장면에서 흐를 곡 (public/music/ 기준) */
  bgm: '1-62 - Coronet Highlands - Base.mp3',
}

const INFO_KEY = 'pokemon-info'
const SPACE_KEY = 'space'

/** 대화창 영역 */
const BOX = {
  x: 24,
  y: 336,
  width: GAME_WIDTH - 48,
  height: GAME_HEIGHT - 336 - 24,
}

const PORTRAIT_SIZE = 116
/** 초상화 중심 — 대화창 왼쪽 위 */
const PORTRAIT_X = BOX.x + 18 + PORTRAIT_SIZE / 2
const PORTRAIT_Y = BOX.y + 14 + PORTRAIT_SIZE / 2

/** 대사가 시작되는 왼쪽 경계 (초상화 오른쪽) */
const TEXT_LEFT = BOX.x + PORTRAIT_SIZE + 44

interface PokemonInfo {
  no: number
  name: string
}

export class DialogueScene extends Phaser.Scene {
  private typing?: Phaser.Time.TimerEvent

  constructor() {
    super(SceneKey.Dialogue)
  }

  preload(): void {
    this.load.image(SPACE_KEY, 'assets/background/space.png')
    this.load.image(SPEAKER.file, `assets/pokemon/artwork/${SPEAKER.file}.png`)
    this.load.json(INFO_KEY, 'data/pokemon-info.json')

    // 5MB 가 넘어서 부팅 때 받지 않고 이 씬에 들어올 때 받습니다.
    // 파일명에 공백이 있어 URL 로 안전하게 바꿔 넘깁니다.
    this.load.audio(AudioKey.Coronet, `music/${encodeURIComponent(SPEAKER.bgm)}`)
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b1730')
    playBgm(this, AudioKey.Coronet)

    this.createStage()
    this.createBox()

    this.input.keyboard!.on('keydown-ESC', () => this.scene.start(SceneKey.Menu))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.typing?.remove())

    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  /** 우주 배경과 그 앞에 뜬 캐릭터 */
  private createStage(): void {
    const space = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, SPACE_KEY)
    // 화면을 가득 덮도록 가로/세로 중 큰 배율을 씁니다.
    space.setScale(Math.max(GAME_WIDTH / space.width, GAME_HEIGHT / space.height))

    const artwork = this.add.image(GAME_WIDTH / 2, (BOX.y - 20) / 2 + 10, SPEAKER.file)
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

    createPokemonFrame(this, PORTRAIT_X, PORTRAIT_Y, SPEAKER.file, {
      size: PORTRAIT_SIZE,
      shape: 'rounded',
      background: 0x241f3d,
      ring: 0x8f7fd4,
      ringWidth: 3,
      padding: 6,
    })

    const name = this.add.text(PORTRAIT_X, PORTRAIT_Y + PORTRAIT_SIZE / 2 + 16, this.speakerName(), {
      fontFamily: FontFamily.Body,
      fontSize: '20px',
      color: '#ffd447',
    })
    name.setOrigin(0.5, 0)

    const line = this.add.text(TEXT_LEFT, BOX.y + 26, '', {
      fontFamily: FontFamily.Body,
      fontSize: '26px',
      color: '#f3efff',
      wordWrap: { width: BOX.x + BOX.width - TEXT_LEFT - 28 },
      lineSpacing: 10,
    })

    this.typeOut(line, SPEAKER.line)
  }

  /** 수집해 둔 도감 정보에서 이름을 가져옵니다. 없으면 파일명에서 떼어 씁니다. */
  private speakerName(): string {
    const list = this.cache.json.get(INFO_KEY) as PokemonInfo[] | undefined
    return list?.find((p) => p.no === SPEAKER.no)?.name ?? SPEAKER.file.slice(5)
  }

  /** RPG 대화창처럼 한 글자씩 찍고, 다 찍으면 아래에 표시를 띄웁니다. */
  private typeOut(target: Phaser.GameObjects.Text, text: string): void {
    let index = 0

    this.typing = this.time.addEvent({
      delay: 60,
      repeat: text.length - 1,
      callback: () => {
        index += 1
        target.setText(text.slice(0, index))
        if (index === text.length) this.showNextIndicator()
      },
    })
  }

  private showNextIndicator(): void {
    const marker = this.add.text(
      BOX.x + BOX.width - 30,
      BOX.y + BOX.height - 30,
      '▼',
      { fontFamily: FontFamily.Body, fontSize: '20px', color: '#8f7fd4' },
    )
    marker.setOrigin(1, 1)

    this.tweens.add({
      targets: marker,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}
