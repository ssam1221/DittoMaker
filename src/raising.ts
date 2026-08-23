/**
 * 육성 진행 상태.
 *
 * 세이브 안에 함께 들어갑니다. 이 값이 없는 예전 세이브는 처음 읽을 때
 * 기본값으로 채워 주므로, 오프닝만 보고 저장해 둔 판도 그대로 이어집니다.
 */

/**
 * 한 달은 상순·중순·하순 세 도막, 한 해는 열두 달로 셉니다.
 * 일정 한 칸이 곧 한 도막입니다.
 */
export const PERIODS_PER_MONTH = 3
export const MONTHS_PER_YEAR = 12
export const PERIODS_PER_YEAR = PERIODS_PER_MONTH * MONTHS_PER_YEAR

export const PERIOD_LABELS = ['상순', '중순', '하순'] as const

/** 아르세우스가 말한 열 해 */
export const TOTAL_YEARS = 10

/**
 * 육성이 시작되는 달. 생일과 무관하게 언제나 여기서 출발합니다.
 * 봄에 시작해야 첫 화면의 창밖도 꽃이 핀 풍경이 됩니다.
 */
export const START_MONTH = 3

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
  specialDefense: number
  speed: number
  /** 화면에는 내지 않지만 계속 쌓이는 값입니다. */
  bond: number
}

export interface RaisingState {
  /** 시작부터 지난 도막 수. 0 이면 첫 달 상순입니다. */
  period: number
  /**
   * 이번 달에 짜 둔 일정. 활동 key 를 순서대로 담으며,
   * 세 칸이 다 차면 그대로 진행할지 묻습니다.
   */
  plan: string[]
  money: number
  stats: Stats
  /** 타입별 적성. 0 ~ TYPE_MAX */
  types: TypeAffinity
  /** 0~100. 낮으면 훈련 효과가 떨어집니다. */
  condition: number
  /** 0~100. 쌓이면 컨디션을 갉아먹습니다. */
  stress: number
  /**
   * 포켓몬센터에서 마지막으로 쉬어 간 달. 한 달에 한 번만 받을 수
   * 있으므로 그 달을 적어 둡니다. -1 이면 아직 간 적이 없습니다.
   */
  centreMonth: number
}

/**
 * 화면에 줄로 내보이는 능력치.
 * bond 는 여기에 없지만 값은 계속 오르내립니다.
 */
export const STAT_LABELS: ReadonlyArray<{ key: keyof Stats; label: string }> = [
  { key: 'hp', label: '체력' },
  { key: 'attack', label: '공격' },
  { key: 'defense', label: '방어' },
  { key: 'special', label: '특수공격' },
  { key: 'specialDefense', label: '특수방어' },
  { key: 'speed', label: '스피드' },
]

/** 모든 타입을 같은 값으로 채운 적성표 */
function makeAffinity(value: number): TypeAffinity {
  return Object.fromEntries(TYPES.map((type) => [type.key, value])) as TypeAffinity
}

export function createRaisingState(): RaisingState {
  return {
    period: 0,
    plan: [],
    money: 3000,
    // 메타몽은 아직 아무것도 아니라 어느 쪽으로도 치우치지 않은 값에서 시작합니다.
    stats: {
      hp: 20,
      attack: 20,
      defense: 20,
      special: 20,
      specialDefense: 20,
      speed: 20,
      bond: 30,
    },
    // 노말만 조금 높습니다. 변신하지 않은 메타몽 자신의 타입입니다.
    types: { ...makeAffinity(0), normal: 20 },
    condition: 80,
    stress: 0,
    centreMonth: -1,
  }
}

/** 예전 세이브에 육성 상태가 없으면 채워 넣습니다. */
export function ensureRaisingState(state: RaisingState | undefined): RaisingState {
  if (!state) return createRaisingState()

  const base = createRaisingState()

  // 한 달을 네 주로 세던 시절의 세이브는 week 를 들고 있습니다.
  // 그 수를 그대로 도막 수로 받아 이어 갑니다.
  const legacy = (state as RaisingState & { week?: number }).week

  return {
    ...base,
    ...state,
    period: state.period ?? legacy ?? 0,
    centreMonth: state.centreMonth ?? -1,
    plan: state.plan ?? [],
    stats: { ...base.stats, ...state.stats },
    // 타입이 나중에 늘어나도 빠진 칸이 생기지 않게 합칩니다.
    types: { ...base.types, ...state.types },
  }
}

export interface GameDate {
  year: number
  month: number
  /** 그 달의 몇 번째 도막인지 (1 상순, 2 중순, 3 하순) */
  period: number
}

/**
 * 시작 연도와 지난 도막 수로 지금 날짜를 구합니다.
 * 0 은 START_MONTH 의 상순이고, 달을 넘기다 해가 바뀌면 연도도 오릅니다.
 */
export function dateOf(startYear: number, period: number): GameDate {
  const monthsElapsed = START_MONTH - 1 + Math.floor(period / PERIODS_PER_MONTH)

  return {
    year: startYear + Math.floor(monthsElapsed / MONTHS_PER_YEAR),
    month: (monthsElapsed % MONTHS_PER_YEAR) + 1,
    period: (period % PERIODS_PER_MONTH) + 1,
  }
}

/** 상순은 1~10일, 중순은 11~20일, 하순은 21일부터 */
export function periodDayRange(period: number, daysInThisMonth: number): [number, number] {
  if (period === 1) return [1, 10]
  if (period === 2) return [11, 20]
  return [21, daysInThisMonth]
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASON_LABELS: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

/** 3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울 */
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** 태어난 뒤 지난 개월 수 */
export function ageInMonths(period: number): number {
  return Math.floor(period / PERIODS_PER_MONTH)
}

export function isFinished(period: number): boolean {
  return period >= PERIODS_PER_YEAR * TOTAL_YEARS
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
    period: state.period + 1,
    stress,
    // 스트레스가 남아 있으면 회복이 덜 됩니다.
    condition: clamp(state.condition + 20 - Math.floor(stress / 5), 0, 100),
    stats: { ...state.stats, bond: clamp(state.stats.bond + 1, 0, STAT_MAX) },
  }
}

/**
 * 시작부터 지난 달 수. 포켓몬센터를 한 달에 한 번으로 묶는 데 씁니다.
 */
export function monthIndex(period: number): number {
  return Math.floor(period / PERIODS_PER_MONTH)
}

/**
 * 포켓몬센터에서 쉬어 가는 값.
 *
 * 지금 쌓인 스트레스의 스물다섯 배입니다. 지쳐 있을수록 손이 많이
 * 가니 비싸고, 멀쩡할 때 들르면 받을 것도 낼 것도 없습니다.
 */
export function centreCost(state: RaisingState): number {
  return state.stress * 25
}

/** 이번 달에 아직 안 갔는지 */
export function centreOpen(state: RaisingState): boolean {
  return state.centreMonth !== monthIndex(state.period)
}

/** 스트레스를 절반으로 덜고 값을 치릅니다. */
export function centreRest(state: RaisingState): RaisingState {
  return {
    ...state,
    money: state.money - centreCost(state),
    // 반올림하면 1 이 남아 다음 달에 또 오게 되므로 버립니다.
    stress: Math.floor(state.stress / 2),
    centreMonth: monthIndex(state.period),
  }
}
