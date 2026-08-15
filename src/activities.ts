import { STAT_MAX, TYPE_MAX, type RaisingState, type Stats, type TypeKey } from './raising'

/**
 * 한 주를 쓰는 일들 — 배우러 가는 수업과 돈을 버는 일자리.
 *
 * 메타몽은 무엇이든 될 수 있으니, 무언가를 하는 일은 그 성질에
 * 익숙해지는 일이기도 합니다. 요리는 재료와 불을 다루니 풀과 불꽃에,
 * 재배는 흙에 심고 물을 주니 풀·물·땅에 가까워지는 식입니다.
 *
 * 수업과 일은 화면과 계산이 같아서 한 자리에 둡니다. 다른 것은
 * 돈의 방향과, 배움에 얼마나 집중하느냐뿐입니다.
 */

export type ActivityKind = 'lesson' | 'job'

export interface Activity {
  key: string
  name: string
  /** 무엇을 하는지 한 줄 */
  description: string
  kind: ActivityKind
  /** 오르는 타입 적성 */
  types: readonly TypeKey[]
  /** 함께 오르는 능력치 */
  stat: keyof Stats
  /** 양수면 버는 돈, 음수면 내는 돈 */
  money: number
  /** 쌓이는 스트레스 */
  stress: number
}

/** 열두 수업이 열여덟 타입을 모두 덮습니다. */
export const LESSONS: readonly Activity[] = [
  {
    key: 'cooking',
    name: '요리',
    description: '재료를 다듬고 불을 다룬다.',
    kind: 'lesson',
    types: ['grass', 'fire'],
    stat: 'hp',
    money: -200,
    stress: 8,
  },
  {
    key: 'gardening',
    name: '재배',
    description: '흙에 심고 물을 준다.',
    kind: 'lesson',
    types: ['grass', 'water', 'ground'],
    stat: 'hp',
    money: -150,
    stress: 6,
  },
  {
    key: 'art',
    name: '미술',
    description: '보이지 않는 것을 그려 본다.',
    kind: 'lesson',
    types: ['fairy', 'psychic'],
    stat: 'special',
    money: -250,
    stress: 9,
  },
  {
    key: 'literature',
    name: '문학',
    description: '옛 이야기와 시를 읽는다.',
    kind: 'lesson',
    types: ['psychic', 'ghost'],
    stat: 'special',
    money: -200,
    stress: 9,
  },
  {
    key: 'music',
    name: '음악',
    description: '소리를 맞추고 노래한다.',
    kind: 'lesson',
    types: ['fairy', 'normal'],
    stat: 'specialDefense',
    money: -250,
    stress: 7,
  },
  {
    key: 'swimming',
    name: '수영',
    description: '찬 물살을 가른다.',
    kind: 'lesson',
    types: ['water', 'ice'],
    stat: 'speed',
    money: -200,
    stress: 11,
  },
  {
    key: 'martial',
    name: '격투술',
    description: '몸을 단련하고 돌을 깬다.',
    kind: 'lesson',
    types: ['fighting', 'rock'],
    stat: 'attack',
    money: -200,
    stress: 12,
  },
  {
    key: 'smithing',
    name: '대장일',
    description: '쇠를 달구고 두드린다.',
    kind: 'lesson',
    types: ['steel', 'fire'],
    stat: 'attack',
    money: -300,
    stress: 13,
  },
  {
    key: 'pharmacy',
    name: '약학',
    description: '이로운 것과 해로운 것을 가린다.',
    kind: 'lesson',
    types: ['grass', 'poison'],
    stat: 'specialDefense',
    money: -200,
    stress: 8,
  },
  {
    key: 'insects',
    name: '곤충채집',
    description: '풀숲과 하늘을 살핀다.',
    kind: 'lesson',
    types: ['bug', 'flying'],
    stat: 'speed',
    money: -150,
    stress: 7,
  },
  {
    key: 'machines',
    name: '기계학',
    description: '전선을 잇고 부품을 맞춘다.',
    kind: 'lesson',
    types: ['electric', 'steel'],
    stat: 'special',
    money: -300,
    stress: 10,
  },
  {
    key: 'folklore',
    name: '옛이야기',
    description: '용과 어둠에 관한 전승을 듣는다.',
    kind: 'lesson',
    types: ['dragon', 'dark'],
    stat: 'specialDefense',
    money: -250,
    stress: 8,
  },
]

/** 일자리. 돈을 벌지만 배우는 양은 수업보다 적습니다. */
export const JOBS: readonly Activity[] = [
  {
    key: 'library',
    name: '도서관 정리',
    description: '조용한 곳에서 책을 갈무리한다.',
    kind: 'job',
    types: ['psychic', 'ghost'],
    stat: 'specialDefense',
    money: 200,
    stress: 7,
  },
  {
    key: 'farm',
    name: '농장 일손',
    description: '밭을 갈고 거둔다.',
    kind: 'job',
    types: ['grass', 'ground'],
    stat: 'hp',
    money: 250,
    stress: 10,
  },
  {
    key: 'diner',
    name: '식당 보조',
    description: '불 앞에 서고 그릇을 닦는다.',
    kind: 'job',
    types: ['fire', 'water'],
    stat: 'hp',
    money: 300,
    stress: 11,
  },
  {
    key: 'ranch',
    name: '목장 일손',
    description: '큰 짐승들을 몰고 돌본다.',
    kind: 'job',
    types: ['normal', 'fighting'],
    stat: 'defense',
    money: 300,
    stress: 12,
  },
  {
    key: 'fishmarket',
    name: '어시장',
    description: '얼음 위의 물고기를 나른다.',
    kind: 'job',
    types: ['water', 'ice'],
    stat: 'speed',
    money: 350,
    stress: 13,
  },
  {
    key: 'mine',
    name: '광산 일손',
    description: '바위를 캐고 쇠를 골라낸다.',
    kind: 'job',
    types: ['rock', 'steel'],
    stat: 'attack',
    money: 450,
    stress: 16,
  },
]

/** 수업은 배우러 가는 것이니 더 많이 얻습니다. */
const GAIN = {
  lesson: { type: 6, stat: 4 },
  job: { type: 3, stat: 2 },
} as const

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * 컨디션이 좋을수록 많이 얻습니다.
 * 100 이면 그대로, 0 이면 절반도 못 얻습니다.
 */
export function learningRate(condition: number): number {
  return 0.4 + (condition / 100) * 0.6
}

/** 내야 할 돈이 있는 경우, 가진 돈으로 되는지 */
export function canAfford(state: RaisingState, activity: Activity): boolean {
  return state.money + activity.money >= 0
}

export interface ActivityResult {
  state: RaisingState
  statGain: number
  typeGains: ReadonlyArray<{ type: TypeKey; gain: number }>
}

/**
 * 한 주를 들여 수업을 듣거나 일을 합니다.
 * 능력치와 타입 적성이 오르고, 스트레스가 쌓이며, 돈이 오갑니다.
 */
export function doActivity(state: RaisingState, activity: Activity): ActivityResult {
  const rate = learningRate(state.condition)
  const gain = GAIN[activity.kind]

  const statGain = Math.max(1, Math.round(gain.stat * rate))

  const types = { ...state.types }
  const typeGains = activity.types.map((type) => {
    const amount = Math.max(1, Math.round(gain.type * rate))
    types[type] = clamp(types[type] + amount, 0, TYPE_MAX)
    return { type, gain: amount }
  })

  const stress = clamp(state.stress + activity.stress, 0, 100)

  return {
    state: {
      ...state,
      week: state.week + 1,
      money: Math.max(0, state.money + activity.money),
      stats: {
        ...state.stats,
        [activity.stat]: clamp(state.stats[activity.stat] + statGain, 0, STAT_MAX),
      },
      types,
      stress,
      // 하고 나면 지칩니다. 스트레스가 높을수록 더 많이 깎입니다.
      condition: clamp(state.condition - 8 - Math.floor(stress / 10), 0, 100),
    },
    statGain,
    typeGains,
  }
}
