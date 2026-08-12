/**
 * 육성 진행 상태.
 *
 * 세이브 안에 함께 들어갑니다. 이 값이 없는 예전 세이브는 처음 읽을 때
 * 기본값으로 채워 주므로, 오프닝만 보고 저장해 둔 판도 그대로 이어집니다.
 */

/** 한 달은 네 주, 한 해는 열두 달로 셉니다. */
export const WEEKS_PER_MONTH = 4
export const MONTHS_PER_YEAR = 12
export const WEEKS_PER_YEAR = WEEKS_PER_MONTH * MONTHS_PER_YEAR

/** 아르세우스가 말한 열 해 */
export const TOTAL_YEARS = 10

export const STAT_MAX = 999

/** 타입 적성의 최대치 */
export const TYPE_MAX = 255

/**
 * 타입 적성. 메타몽은 무엇으로든 변할 수 있으니, 어느 타입에 얼마나
 * 익숙해졌는지를 따로 들고 있습니다.
 *
 * 순서는 포켓몬 타입 상성표의 차례를 따랐습니다.
 */
export const TYPES = [
  { key: 'normal', label: '노말', color: 0xa8a878 },
  { key: 'fighting', label: '격투', color: 0xc03028 },
  { key: 'flying', label: '비행', color: 0xa890f0 },
  { key: 'poison', label: '독', color: 0xa040a0 },
  { key: 'ground', label: '땅', color: 0xe0c068 },
  { key: 'rock', label: '바위', color: 0xb8a038 },
  { key: 'bug', label: '벌레', color: 0xa8b820 },
  { key: 'ghost', label: '고스트', color: 0x705898 },
  { key: 'steel', label: '강철', color: 0xb8b8d0 },
  { key: 'fire', label: '불꽃', color: 0xf08030 },
  { key: 'water', label: '물', color: 0x6890f0 },
  { key: 'grass', label: '풀', color: 0x78c850 },
  { key: 'electric', label: '전기', color: 0xf8d030 },
  { key: 'psychic', label: '에스퍼', color: 0xf85888 },
  { key: 'ice', label: '얼음', color: 0x98d8d8 },
  { key: 'dragon', label: '드래곤', color: 0x7038f8 },
  { key: 'dark', label: '악', color: 0x705848 },
  { key: 'fairy', label: '페어리', color: 0xee99ac },
] as const

export type TypeKey = (typeof TYPES)[number]['key']

export type TypeAffinity = Record<TypeKey, number>

export interface Stats {
  hp: number
  attack: number
  defense: number
  special: number
  speed: number
  bond: number
}

export interface RaisingState {
  /** 시작부터 지난 주 수. 0 이면 첫 주입니다. */
  week: number
  money: number
  stats: Stats
  /** 타입별 적성. 0 ~ TYPE_MAX */
  types: TypeAffinity
  /** 0~100. 낮으면 훈련 효과가 떨어집니다. */
  condition: number
  /** 0~100. 쌓이면 컨디션을 갉아먹습니다. */
  stress: number
}

export const STAT_LABELS: ReadonlyArray<{ key: keyof Stats; label: string }> = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '공격' },
  { key: 'defense', label: '방어' },
  { key: 'special', label: '특수' },
  { key: 'speed', label: '스피드' },
  { key: 'bond', label: '친밀도' },
]

/** 모든 타입을 같은 값으로 채운 적성표 */
function makeAffinity(value: number): TypeAffinity {
  return Object.fromEntries(TYPES.map((type) => [type.key, value])) as TypeAffinity
}

export function createRaisingState(): RaisingState {
  return {
    week: 0,
    money: 3000,
    // 메타몽은 아직 아무것도 아니라 어느 쪽으로도 치우치지 않은 값에서 시작합니다.
    stats: { hp: 20, attack: 20, defense: 20, special: 20, speed: 20, bond: 30 },
    // 노말만 조금 높습니다. 변신하지 않은 메타몽 자신의 타입입니다.
    types: { ...makeAffinity(0), normal: 20 },
    condition: 80,
    stress: 0,
  }
}

/** 예전 세이브에 육성 상태가 없으면 채워 넣습니다. */
export function ensureRaisingState(state: RaisingState | undefined): RaisingState {
  if (!state) return createRaisingState()

  const base = createRaisingState()
  return {
    ...base,
    ...state,
    stats: { ...base.stats, ...state.stats },
    // 타입이 나중에 늘어나도 빠진 칸이 생기지 않게 합칩니다.
    types: { ...base.types, ...state.types },
  }
}

export interface GameDate {
  year: number
  month: number
  /** 그 달의 몇 주차인지 (1~4) */
  week: number
}

/** 시작 연도와 지난 주 수로 지금 날짜를 구합니다. */
export function dateOf(startYear: number, week: number): GameDate {
  return {
    year: startYear + Math.floor(week / WEEKS_PER_YEAR),
    month: (Math.floor(week / WEEKS_PER_MONTH) % MONTHS_PER_YEAR) + 1,
    week: (week % WEEKS_PER_MONTH) + 1,
  }
}

/** 태어난 뒤 지난 개월 수 */
export function ageInMonths(week: number): number {
  return Math.floor(week / WEEKS_PER_MONTH)
}

export function isFinished(week: number): boolean {
  return week >= WEEKS_PER_YEAR * TOTAL_YEARS
}

export function conditionLabel(condition: number): string {
  if (condition >= 85) return '아주 좋음'
  if (condition >= 65) return '좋음'
  if (condition >= 40) return '보통'
  if (condition >= 20) return '나쁨'
  return '지쳐 있음'
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * 한 주를 쉽니다. 스트레스가 줄고 컨디션이 오릅니다.
 * 대신 능력치는 오르지 않습니다.
 */
export function rest(state: RaisingState): RaisingState {
  const stress = clamp(state.stress - 25, 0, 100)

  return {
    ...state,
    week: state.week + 1,
    stress,
    // 스트레스가 남아 있으면 회복이 덜 됩니다.
    condition: clamp(state.condition + 20 - Math.floor(stress / 5), 0, 100),
    stats: { ...state.stats, bond: clamp(state.stats.bond + 1, 0, STAT_MAX) },
  }
}
