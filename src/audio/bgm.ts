import Phaser from 'phaser'

import { channelVolume } from './volume'

/**
 * 배경음을 씬 단위로 갈아끼웁니다.
 *
 * 사운드 매니저는 게임 전체가 공유하므로, 지금 무슨 곡이 흐르는지를
 * 레지스트리(씬을 넘나들어도 남아 있음)에 적어두고 비교합니다.
 * 같은 곡이면 다시 틀지 않아 씬을 오갈 때 노래가 끊기지 않습니다.
 */

const REGISTRY_KEY = 'bgm.current'
const FADE_MS = 700

interface Current {
  key: string
  sound: Phaser.Sound.BaseSound
}

/** 설정에서 배경음 크기를 바꿨을 때 지금 흐르는 곡에 즉시 반영합니다. */
export function refreshBgmVolume(scene: Phaser.Scene): void {
  const current = scene.registry.get(REGISTRY_KEY) as Current | undefined
  if (!current?.sound.isPlaying) return

  scene.tweens.killTweensOf(current.sound)
  ;(current.sound as Phaser.Sound.BaseSound & { setVolume(v: number): unknown }).setVolume(
    channelVolume('bgm'),
  )
}

export function playBgm(scene: Phaser.Scene, key: string, volume = channelVolume('bgm')): void {
  const current = scene.registry.get(REGISTRY_KEY) as Current | undefined

  if (current?.key === key && current.sound.isPlaying) {
    return
  }

  if (current) {
    fadeOutAndRemove(scene, current.sound)
  }

  const next = scene.sound.add(key, { loop: true, volume: 0 })
  scene.registry.set(REGISTRY_KEY, { key, sound: next } satisfies Current)

  const start = (): void => {
    // 잠금이 풀리기 전에 다른 곡으로 넘어갔다면 이 곡은 틀지 않습니다.
    const now = scene.registry.get(REGISTRY_KEY) as Current | undefined
    if (now?.sound !== next) {
      next.destroy()
      return
    }

    next.play()
    scene.tweens.add({ targets: next, volume, duration: FADE_MS })
  }

  if (scene.sound.locked) {
    // 브라우저 자동재생 정책: 사용자가 클릭/키 입력을 해야 소리가 납니다.
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, start)
    return
  }

  start()
}

function fadeOutAndRemove(scene: Phaser.Scene, sound: Phaser.Sound.BaseSound): void {
  if (!sound.isPlaying) {
    sound.destroy()
    return
  }

  scene.tweens.add({
    targets: sound,
    volume: 0,
    duration: FADE_MS,
    onComplete: () => {
      sound.stop()
      sound.destroy()
    },
  })
}
