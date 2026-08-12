import type { RaisingState } from './raising'
import type { MonthDay } from './ui/calendar'

/**
 * 세이브 슬롯 저장소.
 *
 * 슬롯마다 별도의 localStorage 항목을 씁니다. 한 덩어리에 모아 두면
 * 슬롯 하나를 지울 때도 전체를 다시 써야 하고, 한 곳이 깨지면 열 개가
 * 같이 날아갑니다.
 */

export const SLOT_COUNT = 10

/** 슬롯이 열 개가 되기 전에 쓰던 단일 세이브 키 */
const LEGACY_KEY = 'ditto-maker.save'

const slotKey = (slot: number): string => `ditto-maker.save.${slot}`

export interface SaveData {
  year: number
  surname: string
  dittoName: string
  dittoBirthday: MonthDay
  age: number
  birthday: MonthDay
  /** 육성 진행 상태. 오프닝만 본 예전 세이브에는 없습니다. */
  raising?: RaisingState
  /** 이 기록이 들어 있는 슬롯 번호. 덮어 저장할 때 씁니다. */
  slot?: number
}

export interface Slot {
  /** 1 부터 SLOT_COUNT 까지 */
  no: number
  data: SaveData | null
}

function read(key: string): SaveData | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as SaveData)
  } catch {
    // 저장소가 막혀 있거나(시크릿 모드) 값이 깨졌으면 빈 슬롯으로 봅니다.
    return null
  }
}

/**
 * 예전 단일 세이브를 1번 슬롯으로 옮깁니다.
 * 슬롯을 읽기 전에 한 번 불러 두면 기존에 하던 판이 사라지지 않습니다.
 */
function migrateLegacy(): void {
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy === null) return

    // 1번이 비어 있을 때만 옮깁니다. 덮어쓸 이유가 없습니다.
    if (window.localStorage.getItem(slotKey(1)) === null) {
      window.localStorage.setItem(slotKey(1), legacy)
    }
    window.localStorage.removeItem(LEGACY_KEY)
  } catch {
    // 옮기지 못해도 새 슬롯 사용에는 문제가 없습니다.
  }
}

export function readSlot(slot: number): SaveData | null {
  migrateLegacy()
  return read(slotKey(slot))
}

export function listSlots(): Slot[] {
  migrateLegacy()
  return Array.from({ length: SLOT_COUNT }, (_, i) => ({
    no: i + 1,
    data: read(slotKey(i + 1)),
  }))
}

export function writeSlot(slot: number, data: SaveData): void {
  try {
    // 슬롯 번호를 함께 담아 두면 그 판을 이어서 저장할 때 어디에 쓸지 압니다.
    window.localStorage.setItem(slotKey(slot), JSON.stringify({ ...data, slot }))
  } catch {
    // 저장이 막혀도 이번 판은 그대로 이어집니다.
  }
}

export function clearSlot(slot: number): void {
  try {
    window.localStorage.removeItem(slotKey(slot))
  } catch {
    // 지울 것이 없으면 그만입니다.
  }
}

export function hasAnySave(): boolean {
  return listSlots().some((slot) => slot.data !== null)
}

/** 비어 있는 첫 슬롯 번호. 모두 차 있으면 null. */
export function firstEmptySlot(): number | null {
  return listSlots().find((slot) => slot.data === null)?.no ?? null
}

/** 슬롯 목록에 한 줄로 보여줄 요약 */
export function describeSlot(data: SaveData | null): string {
  if (!data) return '비어 있음'

  const birthday = `${data.dittoBirthday.month}/${data.dittoBirthday.day}`
  return `${data.surname} · ${data.dittoName} (${birthday}) · ${data.year}년`
}
