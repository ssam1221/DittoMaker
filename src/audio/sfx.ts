import Phaser from 'phaser'

import { channelVolume } from './volume'

/**
 * 효과음을 한 번 재생합니다.
 *
 * 배경음과 달리 겹쳐 울려도 되고 끝나면 스스로 사라지면 되므로,
 * 곡을 바꿔 끼우는 bgm 쪽과는 따로 둡니다.
 */
export function playSfx(scene: Phaser.Scene, key: string, volume = 1): void {
  const manager = scene.sound

  const start = (): void => {
    // 설정의 효과음 크기를 곱해 냅니다. 마스터는 사운드 매니저가 맡습니다.
    const sound = manager.add(key, { volume: channelVolume('sfx') * volume })
    sound.once(Phaser.Sound.Events.COMPLETE, () => sound.destroy())
    sound.play()
  }

  if (manager.locked) {
    // 아직 소리를 낼 수 없는 상태라면 굳이 대기시키지 않습니다.
    // 효과음은 그 순간을 지나면 의미가 없습니다.
    return
  }

  start()
}

/** 포켓몬 울음소리 파일 경로 (public/ 기준) */
export function cryPath(file: string): string {
  return `sfx/voice/${encodeURIComponent(file)}.ogg`
}
