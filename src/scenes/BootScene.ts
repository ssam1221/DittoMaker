import Phaser from 'phaser'

import { AudioKey, MAIN_FONT, SceneKey, TextureKey } from '../constants'

/**
 * 에셋을 로딩하는 씬. 로딩이 끝나면 곧바로 GameScene 으로 넘어갑니다.
 *
 * 지금은 그림 파일 없이 바로 실행되도록 사각형 텍스처를 코드로 만들어 씁니다.
 * 실제 이미지를 쓸 때는 public/assets/ 에 파일을 넣고 preload() 에서 로드한 뒤
 * createPlaceholderTextures() 호출을 지우면 됩니다.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot)
  }

  preload(): void {
    this.load.image(TextureKey.Logo, 'assets/ditto_logo.png')
    this.load.audio(AudioKey.Opening, 'music/opening.mp3')

    // 예시:
    // this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: 32, frameHeight: 32 })

    this.showLoadingBar()
  }

  create(): void {
    this.createPlaceholderTextures()
    this.startMusic()

    // 폰트가 도착하기 전에 글자를 그리면 대체 폰트로 캔버스에 박혀버립니다.
    // 로드가 끝난(혹은 실패한) 뒤에 다음 씬을 시작합니다.
    void this.loadFonts().then(() => this.scene.start(SceneKey.Menu))
  }

  /** 메인 폰트를 미리 내려받습니다. 실패해도 게임은 대체 폰트로 진행합니다. */
  private async loadFonts(): Promise<void> {
    try {
      await document.fonts.load(`16px "${MAIN_FONT}"`)
      await document.fonts.ready
    } catch (error) {
      console.warn(`폰트 로드 실패: ${MAIN_FONT}`, error)
    }
  }

  /**
   * 배경 음악을 시작합니다. 사운드 매니저는 게임 전체가 공유하므로,
   * 여기서 한 번만 재생하면 씬을 옮겨다녀도 계속 흐릅니다.
   */
  private startMusic(): void {
    const music = this.sound.add(AudioKey.Opening, { loop: true, volume: 0.4 })

    if (this.sound.locked) {
      // 브라우저 자동재생 정책 때문에 사용자가 클릭/키 입력을 하기 전에는
      // 소리를 낼 수 없습니다. Phaser 가 잠금 해제를 감지하면 그때 재생합니다.
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => music.play())
      return
    }

    music.play()
  }

  /** 에셋이 많아지면 유용한 로딩 진행률 표시 */
  private showLoadingBar(): void {
    const { width, height } = this.scale
    const barWidth = 320
    const barHeight = 16
    const x = (width - barWidth) / 2
    const y = height / 2

    const border = this.add.graphics()
    border.lineStyle(2, 0xffffff, 0.6)
    border.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4)

    const bar = this.add.graphics()
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.clear()
      bar.fillStyle(0xffcc00, 1)
      bar.fillRect(x, y, barWidth * value, barHeight)
    })
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      bar.destroy()
      border.destroy()
    })
  }

  private createPlaceholderTextures(): void {
    this.makeRectTexture(TextureKey.Player, 28, 36, 0xffcc00)
    this.makeRectTexture(TextureKey.Ground, 64, 24, 0x3a5a40)
    this.makeRectTexture(TextureKey.Coin, 14, 14, 0xf7c948)
  }

  /** 단색 사각형을 텍스처로 구워서 스프라이트처럼 쓸 수 있게 합니다. */
  private makeRectTexture(key: string, width: number, height: number, color: number): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.generateTexture(key, width, height)
    graphics.destroy()
  }
}
