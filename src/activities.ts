import { STAT_MAX, TYPE_MAX, type RaisingState, type Stats, type TypeKey } from './raising'
import { isWeekend, weekdayOf } from './ui/calendar'

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

export type ActivityKind = 'lesson' | 'job' | 'rest'

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

/** 한 도막을 그냥 쉬는 것도 일정의 한 칸입니다. */
export const REST: Activity = {
  key: 'rest',
  name: '휴식',
  description: '아무것도 하지 않고 쉰다.',
  kind: 'rest',
  types: [],
  stat: 'bond',
  money: 0,
  stress: 0,
}

export const ALL_ACTIVITIES: readonly Activity[] = [...LESSONS, ...JOBS, REST]

export function findActivity(key: string): Activity | undefined {
  return ALL_ACTIVITIES.find((a) => a.key === key)
}

/** 수업은 배우러 가는 것이니 더 많이 얻습니다. */
const GAIN = {
  lesson: { type: 6, stat: 4 },
  job: { type: 3, stat: 2 },
  rest: { type: 0, stat: 0 },
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

/**
 * 그날의 성과. 컨디션이 좋고 스트레스가 낮을수록 상이 자주 나옵니다.
 *
 * 같은 아이가 같은 수업을 들어도 날마다 다르게 만들려고 약간의 운을
 * 섞습니다. 다만 운의 폭보다 컨디션의 폭이 넓어서, 지쳐 있으면
 * 아무리 운이 좋아도 상은 잘 나오지 않습니다.
 */
export type Grade = 'high' | 'mid' | 'low'

export const GRADE_LABELS: Record<Grade, string> = {
  high: '상',
  mid: '중',
  low: '하',
}

/** 성과에 곱하는 값 — 중을 1 로 두고 위아래로 벌립니다. */
const GRADE_GAIN: Record<Grade, number> = {
  high: 1.4,
  mid: 1,
  low: 0.55,
}

export function gradeOf(condition: number, stress: number, roll: number = Math.random()): Grade {
  const score = condition - stress * 0.5 + roll * 36 - 18

  if (score >= 62) return 'high'
  if (score >= 28) return 'mid'
  return 'low'
}

/** 하루가 끝나고 화면에 띄우는 한 줄 */
const DAY_MESSAGES: Record<ActivityKind, Record<Grade, readonly string[]>> = {
  lesson: {
    high: [
      '오늘은 아주 잘 배웠다.',
      '하나를 알려 주니 열을 알았다.',
      '선생이 크게 칭찬했다.',
    ],
    mid: ['오늘은 무난히 배웠다.', '배운 것을 몇 번이고 곱씹었다.', '빠짐없이 따라갔다.'],
    low: [
      '오늘은 영 집중이 되지 않았다.',
      '몸이 무거워 자꾸 놓쳤다.',
      '머리에 들어오는 것이 없었다.',
    ],
  },
  job: {
    high: ['오늘은 능숙하게 일을 했다.', '손이 척척 맞았다.', '주인이 흐뭇하게 바라보았다.'],
    mid: ['시키는 대로 해냈다.', '오늘 몫은 다 채웠다.', '별일 없이 하루가 갔다.'],
    low: ['실수가 잦아 몇 번 혼이 났다.', '손이 자꾸 미끄러졌다.', '일이 좀처럼 늘지 않았다.'],
  },
  rest: {
    high: ['아무것도 하지 않고 푹 쉬었다.', '늘어지게 낮잠을 잤다.', '창밖을 오래 바라보았다.'],
    mid: ['아무것도 하지 않고 푹 쉬었다.', '늘어지게 낮잠을 잤다.', '창밖을 오래 바라보았다.'],
    low: ['아무것도 하지 않고 푹 쉬었다.', '늘어지게 낮잠을 잤다.', '창밖을 오래 바라보았다.'],
  },
}

export function dayMessage(
  kind: ActivityKind,
  grade: Grade,
  roll: number = Math.random(),
): string {
  const lines = DAY_MESSAGES[kind][grade]
  return lines[Math.floor(roll * lines.length)] ?? lines[0]!
}

/** 일정 한 칸 — 어떤 활동을 달력의 어느 날부터 며칠 동안 하는지 */
export interface DaySlot {
  activity: Activity
  year: number
  month: number
  /** 이 도막의 첫날 */
  firstDay: number
  days: number
}

/** 하루의 기록. 화면은 이것을 하루에 하나씩 넘겨 가며 보여 줍니다. */
export interface DayLog {
  /** 몇 번째 칸인지 (0 부터) */
  slot: number
  /** 짜 놓은 활동. 돈이 모자라 쉬게 되면 activity 와 달라집니다. */
  planned: Activity
  activity: Activity
  /** 이 활동의 며칠째인지 (1 부터). 휴일은 세지 않습니다. */
  dayInSlot: number
  days: number
  month: number
  day: number
  /** 0 이 일요일 */
  weekday: number
  /** 토·일에는 아무 일도 하지 않습니다. */
  holiday: boolean
  /** 휴일에는 성과가 없습니다. */
  grade?: Grade
  /** 그날 오간 돈 */
  money: number
  /** 하루가 끝난 뒤의 상태 */
  state: RaisingState
}

export interface MonthRun {
  logs: DayLog[]
  state: RaisingState
}

/** 소수점을 들고 다니며 정수가 될 때마다 덜어 냅니다. */
interface Carry {
  value: number
}

function take(carry: Carry, amount: number): number {
  carry.value += amount
  const whole = Math.trunc(carry.value)
  carry.value -= whole
  return whole
}

const carryOf = (map: Map<string, Carry>, key: string): Carry => {
  const found = map.get(key)
  if (found) return found

  const made: Carry = { value: 0 }
  map.set(key, made)
  return made
}

/**
 * 짜 놓은 일정을 하루씩 치릅니다.
 *
 * 한 도막에서 얻는 총량은 예전과 같게 두고, 그것을 날수로 나눠
 * 그날의 성과(상·중·하)를 곱합니다. 하루치는 대개 1 도 되지 않으므로
 * 소수점을 들고 다니다가 정수가 되는 날 능력치가 한 칸 오릅니다.
 *
 * 돈이 모자란 칸은 예전처럼 쉬는 것으로 바뀝니다.
 */
export function runMonth(start: RaisingState, slots: readonly DaySlot[]): MonthRun {
  const stats = { ...start.stats }
  const types = { ...start.types }

  let money = start.money
  let condition = start.condition
  let stress = start.stress
  let period = start.period

  const statCarry = new Map<string, Carry>()
  const typeCarry = new Map<string, Carry>()
  const moneyCarry: Carry = { value: 0 }

  const logs: DayLog[] = []

  for (const [index, slot] of slots.entries()) {
    const planned = slot.activity
    // 앞 칸에서 돈을 다 썼다면 남은 칸은 쉬는 것으로 대신합니다.
    const activity = money + planned.money >= 0 ? planned : REST

    const rate = learningRate(condition)
    const gain = GAIN[activity.kind]

    // 토·일은 쉬므로, 한 도막에서 얻는 총량을 일하는 날수로 나눕니다.
    // 그래야 주말이 몇 번 끼든 한 도막의 결과가 들쭉날쭉하지 않습니다.
    const working =
      [...Array(slot.days).keys()].filter(
        (offset) => !isWeekend(slot.year, slot.month, slot.firstDay + offset),
      ).length || slot.days

    const statPerDay = (gain.stat * rate) / working
    const typePerDay = (gain.type * rate) / working
    const moneyPerDay = activity.money / working
    const stressPerDay = activity.stress / working

    let worked = 0

    for (let offset = 0; offset < slot.days; offset += 1) {
      const date = slot.firstDay + offset
      const weekday = weekdayOf(slot.year, slot.month, date)

      // 휴일에는 능력치도 돈도 그대로 두고 날짜만 넘깁니다.
      if (isWeekend(slot.year, slot.month, date)) {
        logs.push({
          slot: index,
          planned,
          activity,
          dayInSlot: worked,
          days: slot.days,
          month: slot.month,
          day: date,
          weekday,
          holiday: true,
          money: 0,
          state: {
            period,
            plan: [],
            money,
            stats: { ...stats },
            types: { ...types },
            condition: Math.round(condition),
            stress: Math.round(stress),
          },
        })
        continue
      }

      worked += 1

      const grade = gradeOf(condition, stress)
      const multiplier = GRADE_GAIN[grade]

      if (activity.kind === 'rest') {
        // 쉬는 날은 스트레스가 풀리고 컨디션이 돌아옵니다.
        stress = clamp(stress - 25 / working, 0, 100)
        condition = clamp(condition + (20 - stress / 5) / working, 0, 100)
      } else {
        const statGain = take(carryOf(statCarry, activity.stat), statPerDay * multiplier)
        stats[activity.stat] = clamp(stats[activity.stat] + statGain, 0, STAT_MAX)

        for (const type of activity.types) {
          const typeGain = take(carryOf(typeCarry, type), typePerDay * multiplier)
          types[type] = clamp(types[type] + typeGain, 0, TYPE_MAX)
        }

        stress = clamp(stress + stressPerDay, 0, 100)
        condition = clamp(condition - (8 + stress / 10) / working, 0, 100)
      }

      // 쉬는 칸은 하루하루 오르는 것이 없는 대신 마지막 날 정이 붙습니다.
      if (activity.kind === 'rest' && worked === working) {
        stats.bond = clamp(stats.bond + 1, 0, STAT_MAX)
      }

      const earned = take(moneyCarry, moneyPerDay)
      money = Math.max(0, money + earned)

      logs.push({
        slot: index,
        planned,
        activity,
        dayInSlot: worked,
        days: slot.days,
        month: slot.month,
        day: date,
        weekday,
        holiday: false,
        grade,
        money: earned,
        state: {
          period,
          plan: [],
          money,
          stats: { ...stats },
          types: { ...types },
          condition: Math.round(condition),
          stress: Math.round(stress),
        },
      })
    }

    period += 1
  }

  return {
    logs,
    state: {
      period,
      plan: [],
      money,
      stats,
      types,
      condition: Math.round(condition),
      stress: Math.round(stress),
    },
  }
}
