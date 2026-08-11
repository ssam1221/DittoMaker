import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from './constants'
import { BootScene } from './scenes/BootScene'
import { DialogueScene } from './scenes/DialogueScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { SettingsScene } from './scenes/SettingsScene'
import { SetupScene } from './scenes/SetupScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1d2b53',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      // 히트박스를 눈으로 확인하려면 true 로 바꾸세요.
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, SettingsScene, SetupScene, DialogueScene, GameScene],
}

const game = new Phaser.Game(config)

// 개발 중에는 브라우저 콘솔에서 game 으로 내부 상태를 들여다볼 수 있게 해둡니다.
// (프로덕션 빌드에는 포함되지 않습니다)
if (import.meta.env.DEV) {
  ;(window as unknown as { game: Phaser.Game }).game = game
}

// M 키로 전체 음소거를 토글합니다. 어떤 씬에 있든 동작하도록 window 에 걸어둡니다.
window.addEventListener('keydown', (event) => {
  if (event.key !== 'm' && event.key !== 'M') {
    return
  }

  // Exit 으로 게임을 종료한 뒤에는 사운드 매니저가 없습니다.
  if (!game.sound) {
    return
  }

  game.sound.mute = !game.sound.mute
})
