import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey, TextureKey } from '../constants'

const MOVE_SPEED = 220
const JUMP_SPEED = 520

/** 충돌/겹침 콜백이 넘겨주는 객체 타입 (Phaser 버전에 따라 달라져서 추론해 씁니다) */
type ArcadeCallbackObject = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0]

/** 공중 발판 위치 [x, y] */
const LEDGES: ReadonlyArray<readonly [number, number]> = [
  [180, 400],
  [244, 400],
  [520, 330],
  [584, 330],
  [800, 250],
  [864, 250],
]

/** 코인 위치 [x, y] */
const COINS: ReadonlyArray<readonly [number, number]> = [
  [212, 340],
  [552, 270],
  [832, 190],
  [420, 470],
]

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private coins!: Phaser.Physics.Arcade.Group
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private scoreText!: Phaser.GameObjects.Text
  private score = 0

  constructor() {
    super(SceneKey.Game)
  }

  create(): void {
    this.score = 0

    this.createPlatforms()
    this.createPlayer()
    this.createCoins()
    this.createHud()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start(SceneKey.Menu))

    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  override update(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-MOVE_SPEED)
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(MOVE_SPEED)
    } else {
      this.player.setVelocityX(0)
    }

    // blocked.down: 바닥이나 발판에 실제로 닿아 있을 때만 점프 허용
    if (this.cursors.up.isDown && body.blocked.down) {
      this.player.setVelocityY(-JUMP_SPEED)
    }
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup()

    // 화면 아래를 가로지르는 바닥
    for (let x = 32; x < GAME_WIDTH + 32; x += 64) {
      this.platforms.create(x, GAME_HEIGHT - 12, TextureKey.Ground)
    }

    for (const [x, y] of LEDGES) {
      this.platforms.create(x, y, TextureKey.Ground)
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(80, GAME_HEIGHT - 120, TextureKey.Player)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, this.platforms)
  }

  private createCoins(): void {
    this.coins = this.physics.add.group()

    for (const [x, y] of COINS) {
      const coin = this.coins.create(x, y, TextureKey.Coin) as Phaser.Physics.Arcade.Sprite
      coin.setBounceY(0.4)
    }

    this.physics.add.collider(this.coins, this.platforms)
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this)
  }

  private createHud(): void {
    this.scoreText = this.add.text(16, 16, 'SCORE 0', {
      fontFamily: FontFamily.Body,
      fontSize: '22px',
      color: '#ffffff',
    })

    this.add.text(16, 46, '← → 이동   ↑ 점프   Esc 메뉴로', {
      fontFamily: FontFamily.Body,
      fontSize: '16px',
      color: '#aab4d4',
    })
  }

  private collectCoin(_player: ArcadeCallbackObject, coin: ArcadeCallbackObject): void {
    ;(coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true)

    this.score += 10
    this.scoreText.setText(`SCORE ${this.score}`)
  }
}
