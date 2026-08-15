import {
  STAT_MAX,
  TYPE_MAX,
  type RaisingState,
  type Stats,
  type TypeKey,
} from './raising'

/**
 * 배우러 다니는 일상 수업들.
 *
 * 메타몽은 무엇이든 될 수 있으니, 무언가를 배우는 일은 그 성질에
 * 익숙해지는 일이기도 합니다. 요리는 재료와 불을 다루니 풀과 불꽃에,
 * 재배는 흙에 심고 물을 주니 풀·물·땅에 가까워지는 식입니다.
 *
 * 열두 수업이 열여덟 타입을 모두 덮습니다.
 */

export interface Lesson {
  key: string
  name: string
  /** 무엇을 하는 수업인지 한 줄 */
  description: string
  /** 오르는 타입 적성 */
  types: readonly TypeKey[]
  /** 함께 오르는 능력치 */
  stat: keyof Stats
  /** 한 주 수업료 */
  cost: number
  /** 쌓이는 스트레스 */
  stress: number
}

export const LESSONS: readonly Lesson[] = [
  {
    key: 'cooking',
    name: '요리',
    description: '재료를 다듬고 불을 다룬다.',
    types: ['grass', 'fire'],
    stat: 'hp',
    cost: 200,
    stress: 8,
  },
  {
    key: 'gardening',
    name: '재배',
    description: '흙에 심고 물을 준다.',
    types: ['grass', 'water', 'ground'],
    stat: 'hp',
    cost: 150,
    stress: 6,
  },
  {
    key: 'art',
    name: '미술',
    description: '보이지 않는 것을 그려 본다.',
    types: ['fairy', 'psychic'],
    stat: 'special',
    cost: 250,
    stress: 9,
  },
  {
    key: 'literature',
    name: '문학',
    description: '옛 이야기와 시를 읽는다.',
    types: ['psychic', 'ghost'],
    stat: 'special',
    cost: 200,
    stress: 9,
  },
  {
    key: 'music',
    name: '음악',
    description: '소리를 맞추고 노래한다.',
    types: ['fairy', 'normal'],
    stat: 'specialDefense',
    cost: 250,
    stress: 7,
  },
  {
    key: 'swimming',
    name: '수영',
    description: '찬 물살을 가른다.',
    types: ['water', 'ice'],
    stat: 'speed',
    cost: 200,
    stress: 11,
  },
  {
    key: 'hiking',
    name: '등산',
    description: '흙길과 바위를 오른다.',
    types: ['ground', 'rock', 'fighting'],
    stat: 'defense',
    cost: 150,
    stress: 12,
  },
  {
    key: 'smithing',
    name: '대장일',
    description: '쇠를 달구고 두드린다.',
    types: ['steel', 'fire'],
    stat: 'attack',
    cost: 300,
    stress: 13,
  },
  {
    key: 'herbs',
    name: '약초학',
    description: '이로운 풀과 해로운 풀을 가린다.',
    types: ['grass', 'poison'],
    stat: 'specialDefense',
    cost: 200,
    stress: 8,
  },
  {
    key: 'insects',
    name: '곤충채집',
    description: '풀숲과 하늘을 살핀다.',
    types: ['bug', 'flying'],
    stat: 'speed',
    cost: 150,
    stress: 7,
  },
  {
    key: 'machines',
    name: '기계수리',
    description: '전선을 잇고 부품을 맞춘다.',
    types: ['electric', 'steel'],
    stat: 'special',
    cost: 300,
    stress: 10,
  },
  {
    key: 'folklore',
    name: '옛이야기',
    description: '용과 어둠에 관한 전승을 듣는다.',
    types: ['dragon', 'dark'],
    stat: 'specialDefense',
    cost: 250,
    stress: 8,
  },
]

/** 한 번 배우면 오르는 기본치 */
const TYPE_GAIN = 6
const STAT_GAIN = 4

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * 컨디션이 좋을수록 많이 배웁니다.
 * 100 이면 그대로, 0 이면 절반도 못 얻습니다.
 */
export function learningRate(condition: number): number {
  return 0.4 + (condition / 100) * 0.6
}

export function canAfford(state: RaisingState, lesson: Lesson): boolean {
  return state.money >= lesson.cost
}

export interface LessonResult {
  state: RaisingState
  /** 실제로 오른 능력치 */
  statGain: number
  /** 타입별로 실제로 오른 값 */
  typeGains: ReadonlyArray<{ type: TypeKey; gain: number }>
}

/**
 * 한 주 동안 수업을 듣습니다.
 * 능력치와 타입 적성이 오르고, 스트레스가 쌓이며, 수업료가 나갑니다.
 */
export function takeLesson(state: RaisingState, lesson: Lesson): LessonResult {
  const rate = learningRate(state.condition)
  const statGain = Math.max(1, Math.round(STAT_GAIN * rate))

  const types = { ...state.types }
  const typeGains = lesson.types.map((type) => {
    const gain = Math.max(1, Math.round(TYPE_GAIN * rate))
    types[type] = clamp(types[type] + gain, 0, TYPE_MAX)
    return { type, gain }
  })

  const stress = clamp(state.stress + lesson.stress, 0, 100)

  return {
    state: {
      ...state,
      week: state.week + 1,
      money: state.money - lesson.cost,
      stats: {
        ...state.stats,
        [lesson.stat]: clamp(state.stats[lesson.stat] + statGain, 0, STAT_MAX),
      },
      types,
      stress,
      // 배우고 나면 지칩니다. 스트레스가 높을수록 더 많이 깎입니다.
      condition: clamp(state.condition - 8 - Math.floor(stress / 10), 0, 100),
    },
    statGain,
    typeGains,
  }
}
