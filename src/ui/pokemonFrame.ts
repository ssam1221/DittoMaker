import Phaser from 'phaser'

export type FrameShape = 'circle' | 'rounded'

export interface PokemonFrameOptions {
  /** 틀 한 변의 길이 */
  size?: number
  shape?: FrameShape
  /** 틀 안쪽 색 */
  background?: number
  backgroundAlpha?: number
  /** 테두리 색. 생략하면 테두리를 그리지 않습니다. */
  ring?: number
  ringWidth?: number
  /** 일러스트와 틀 사이 여백 */
  padding?: number
}

const DEFAULTS = {
  size: 200,
  shape: 'circle' as FrameShape,
  background: 0x2a2440,
  backgroundAlpha: 1,
  ring: 0x6b5ea8,
  ringWidth: 4,
  padding: 10,
}

/**
 * 포켓몬 공식 일러스트를 둥근 틀에 담아 반환합니다.
 *
 * 일러스트를 잘라내지 않고 통째로 축소해 넣습니다. 얼굴 위치를 추정할
 * 필요가 없으므로 어떤 포켓몬이든 실패하지 않습니다.
 *
 * 마스크를 쓰지 않는 이유: 원본이 이미 투명 배경이고 정사각형이라
 * 틀 안에 그대로 들어갑니다. 마스크는 Phaser 4 에서 필터로 옮겨가
 * 비용이 더 드는데, 여기서는 얻는 게 없습니다.
 */
export function createPokemonFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  options: PokemonFrameOptions = {},
): Phaser.GameObjects.Container {
  const { size, shape, background, backgroundAlpha, ring, ringWidth, padding } = {
    ...DEFAULTS,
    ...options,
  }

  const radius = size / 2
  const graphics = scene.add.graphics()

  graphics.fillStyle(background, backgroundAlpha)
  if (shape === 'circle') {
    graphics.fillCircle(0, 0, radius)
  } else {
    graphics.fillRoundedRect(-radius, -radius, size, size, size * 0.18)
  }

  if (ringWidth > 0) {
    graphics.lineStyle(ringWidth, ring, 1)
    if (shape === 'circle') {
      graphics.strokeCircle(0, 0, radius - ringWidth / 2)
    } else {
      graphics.strokeRoundedRect(
        -radius + ringWidth / 2,
        -radius + ringWidth / 2,
        size - ringWidth,
        size - ringWidth,
        size * 0.18,
      )
    }
  }

  const artwork = scene.add.image(0, 0, texture)
  // 원 안에 들어가도록 가로/세로 중 큰 쪽을 기준으로 축소합니다.
  const inner = size - padding * 2
  artwork.setScale(Math.min(inner / artwork.width, inner / artwork.height))

  return scene.add.container(x, y, [graphics, artwork])
}
