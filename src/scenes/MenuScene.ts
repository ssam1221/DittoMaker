import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { hasAnySave } from '../save'
import {
  AudioKey,
  FontFamily,
  GAME_HEIGHT,
  GAME_WIDTH,
  SceneKey,
  TextureKey,
} from '../constants'

type MenuAction = 'new' | 'load' | 'settings' | 'exit'

interface MenuItem {
  readonly action: MenuAction
  readonly enabled: boolean
  readonly text: Phaser.GameObjects.Text
}

const MENU_TOP = 258
const MENU_GAP = 56

const COLOR_IDLE = '#cfc6e8'
const COLOR_SELECTED = '#ffd447'
const COLOR_DISABLED = '#5d5878'

/** 게임을 켜면 처음 보이는 메인 화면. 키보드와 마우스를 모두 지원합니다. */
export class MenuScene extends Phaser.Scene {
  private items: MenuItem[] = []
  private selectedIndex = 0
  private marker!: Phaser.GameObjects.Text
  private toast?: Phaser.GameObjects.Text

  constructor() {
    super(SceneKey.Menu)
  }

  create(): void {
    this.items = []
    this.selectedIndex = 0

    playBgm(this, AudioKey.Opening)

    this.createBackground()
    this.createTitle()
    this.createMenu()
    this.createHint()
    this.bindKeyboard()

    this.refreshSelection()
    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor('#141026')

    const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TextureKey.Logo)
    // 잘리지 않고 전체가 보이도록 가로/세로 중 더 작은 배율을 씁니다.
    // (출렁이는 트윈이 화면 밖으로 나가지 않게 살짝 여유를 둡니다)
    const fit = Math.min(GAME_WIDTH / logo.width, GAME_HEIGHT / logo.height) * 0.94
    logo.setScale(fit)

    // 디토답게 천천히 출렁이는 느낌
    this.tweens.add({
      targets: logo,
      scaleX: fit * 1.05,
      scaleY: fit * 0.95,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // 메뉴 글씨 가독성을 위해 배경 위에 어두운 막을 한 겹 덮습니다.
    const shade = this.add.graphics()
    shade.fillStyle(0x141026, 0.58)
    shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  private createTitle(): void {
    const title = this.add.text(GAME_WIDTH / 2, 132, 'Ditto Maker', {
      fontFamily: FontFamily.Title,
      fontSize: '72px',
      color: '#f3e9ff',
    })
    title.setOrigin(0.5)
    title.setStroke('#3b2a5a', 10)
    title.setShadow(0, 6, '#000000', 14, true, true)
  }

  private createMenu(): void {
    this.marker = this.add.text(0, 0, '▶', {
      fontFamily: FontFamily.Body,
      fontSize: '26px',
      color: COLOR_SELECTED,
    })
    this.marker.setOrigin(0.5)

    const definitions: ReadonlyArray<{ action: MenuAction; label: string; enabled: boolean }> = [
      { action: 'new', label: 'New Game', enabled: true },
      { action: 'load', label: 'Load Game', enabled: hasAnySave() },
      { action: 'settings', label: 'Settings', enabled: true },
      { action: 'exit', label: 'Exit', enabled: true },
    ]

    definitions.forEach((definition, index) => {
      const text = this.add.text(GAME_WIDTH / 2, MENU_TOP + index * MENU_GAP, definition.label, {
        fontFamily: FontFamily.Body,
        fontSize: '32px',
        color: COLOR_IDLE,
      })
      text.setOrigin(0.5)
      text.setInteractive({ useHandCursor: definition.enabled })

      text.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        // 비활성 항목 위에서는 선택이 움직이지 않습니다.
        if (!definition.enabled) {
          return
        }
        this.selectedIndex = index
        this.refreshSelection()
      })

      text.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (definition.enabled) {
          this.selectedIndex = index
          this.refreshSelection()
        }
        this.activate(index)
      })

      this.items.push({ action: definition.action, enabled: definition.enabled, text })
    })

    // 첫 선택은 활성화된 첫 항목으로
    this.selectedIndex = this.items.findIndex((item) => item.enabled)
  }

  private createHint(): void {
    const hint = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 36,
      '↑ ↓ 이동    Enter / Space 선택    M 음소거    마우스 클릭도 됩니다',
      {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#8f86ad',
      },
    )
    hint.setOrigin(0.5)
  }

  private bindKeyboard(): void {
    // 씬이 종료되면 이 리스너들도 함께 정리됩니다.
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.moveSelection(-1))
    keyboard.on('keydown-W', () => this.moveSelection(-1))
    keyboard.on('keydown-DOWN', () => this.moveSelection(1))
    keyboard.on('keydown-S', () => this.moveSelection(1))
    keyboard.on('keydown-ENTER', () => this.activate(this.selectedIndex))
    keyboard.on('keydown-SPACE', () => this.activate(this.selectedIndex))
  }

  /** 비활성 항목은 건너뛰면서 위/아래로 이동합니다. */
  private moveSelection(delta: number): void {
    const count = this.items.length

    for (let step = 1; step <= count; step += 1) {
      const index = (this.selectedIndex + delta * step + count * count) % count
      if (this.items[index]!.enabled) {
        this.selectedIndex = index
        this.refreshSelection()
        return
      }
    }
  }

  private refreshSelection(): void {
    this.items.forEach((item, index) => {
      if (!item.enabled) {
        item.text.setColor(COLOR_DISABLED)
        item.text.setScale(1)
        return
      }

      const selected = index === this.selectedIndex
      item.text.setColor(selected ? COLOR_SELECTED : COLOR_IDLE)
      item.text.setScale(selected ? 1.12 : 1)
    })

    const current = this.items[this.selectedIndex]
    if (current) {
      this.marker.setPosition(current.text.x - current.text.displayWidth / 2 - 30, current.text.y)
      this.marker.setVisible(true)
    } else {
      this.marker.setVisible(false)
    }
  }

  private activate(index: number): void {
    const item = this.items[index]
    if (!item) {
      return
    }

    if (!item.enabled) {
      this.showToast('저장된 게임이 없습니다')
      return
    }

    switch (item.action) {
      case 'new':
        this.leaveTo(SceneKey.Setup)
        break
      case 'load':
        this.leaveTo(SceneKey.Slots, { mode: 'load' })
        break
      case 'settings':
        this.leaveTo(SceneKey.Settings)
        break
      case 'exit':
        this.exitGame()
        break
    }
  }

  private leaveTo(scene: string, data?: object): void {
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(scene, data)
    })
  }

  private exitGame(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.game.destroy(true)

      // 브라우저는 스크립트가 연 창이 아니면 close() 를 막습니다.
      // 데스크톱 빌드(Electron 등)에서는 실제로 닫히고, 웹에서는 아래 종료 화면이 남습니다.
      window.close()

      const parent = document.getElementById('game')
      if (parent) {
        parent.innerHTML =
          `<p style="color:#8f86ad;font-family:${FontFamily.Body};font-size:20px">` +
          'Thanks for playing Ditto Maker.' +
          '</p>'
      }
    })
  }

  private showToast(message: string): void {
    this.toast?.destroy()

    // 메뉴 항목과 겹치지 않도록 제목과 메뉴 사이에 띄웁니다.
    const toast = this.add.text(GAME_WIDTH / 2, 212, message, {
      fontFamily: FontFamily.Body,
      fontSize: '18px',
      color: '#ffb4b4',
    })
    toast.setOrigin(0.5)
    this.toast = toast

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1400,
      duration: 500,
      onComplete: () => toast.destroy(),
    })
  }
}
