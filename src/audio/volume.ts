import Phaser from 'phaser'

/**
 * 소리 크기 설정을 한 곳에서 관리합니다.
 *
 * 마스터는 게임 전체 출력에 걸고, 배경음·효과음은 각 소리를 만들 때
 * 곱해서 씁니다. 값은 localStorage 에 남아 다음 실행에도 유지됩니다.
 */

const STORAGE_KEY = 'ditto-maker.volume'

export type VolumeChannel = 'master' | 'bgm' | 'sfx'

export interface VolumeSettings {
  master: number
  bgm: number
  sfx: number
}

const DEFAULTS: VolumeSettings = {
  master: 0.8,
  bgm: 0.5,
  sfx: 0.8,
}

let settings: VolumeSettings = { ...DEFAULTS }
let loaded = false

function clamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback
}

function load(): void {
  if (loaded) return
  loaded = true

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as Partial<VolumeSettings>
    settings = {
      master: clamp(parsed.master, DEFAULTS.master),
      bgm: clamp(parsed.bgm, DEFAULTS.bgm),
      sfx: clamp(parsed.sfx, DEFAULTS.sfx),
    }
  } catch {
    // localStorage 차단(시크릿 모드)이나 깨진 값은 기본값으로 진행합니다.
    settings = { ...DEFAULTS }
  }
}

function save(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 저장이 막혀도 이번 실행 동안은 설정이 유지됩니다.
  }
}

export function getVolumes(): VolumeSettings {
  load()
  return { ...settings }
}

/** 해당 채널의 소리가 실제로 나야 하는 크기 (마스터가 이미 곱해진 값은 아님) */
export function channelVolume(channel: Exclude<VolumeChannel, 'master'>): number {
  load()
  return settings[channel]
}

/**
 * 마스터는 사운드 매니저 전체 볼륨으로 적용합니다.
 * 배경음 크기를 바꾸면 지금 흐르는 곡에도 바로 반영해야 하므로,
 * 실제 반영은 이 함수를 부르는 쪽(bgm.ts)에서 맡습니다.
 */
export function setVolume(scene: Phaser.Scene, channel: VolumeChannel, value: number): void {
  load()
  settings[channel] = Math.min(1, Math.max(0, value))
  save()

  if (channel === 'master') {
    scene.sound.setVolume(settings.master)
  }
}

/** 게임이 시작될 때 한 번 불러 마스터 볼륨을 반영합니다. */
export function applyMasterVolume(scene: Phaser.Scene): void {
  load()
  scene.sound.setVolume(settings.master)
}
