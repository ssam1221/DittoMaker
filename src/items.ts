import { STAT_LABELS, STAT_MAX, type RaisingState, type Stats } from './raising'
import { withJosa } from './ui/hangul'

/**
 * 프렌들리숍에서 파는 열매.
 *
 * 사면 그 자리에서 메타몽이 먹습니다. 가방을 따로 두지 않은 것은,
 * 아직 쓸 곳이 상점밖에 없어 넣어 두었다 꺼내는 손이 늘기만 하기
 * 때문입니다. 나중에 모험이 생기면 그때 가방을 붙이면 됩니다.
 *
 * 무엇이 오르는지는 본가에서 그 열매가 하는 일을 그대로 따랐습니다.
 * 오랭열매는 체력을 채워 주니 체력이 오르고, 리리바·우무·마루비·
 * 아파코·미캉은 궁지에 몰렸을 때 저마다 한 가지 능력을 끌어올리는
 * 열매라 그 능력이 오릅니다. 한 알에 3 씩인데, 수업 한 칸이 4 쯤
 * 올리는 것을 생각하면 시간을 돈으로 조금 사는 셈입니다.
 */

export interface Berry {
  key: string
  name: string
  price: number
  /** 목록 가운데 칸에 한 줄로 보이는 효과 */
  effect: string
  /** 먹였을 때 오르는 능력치 */
  stat?: { key: keyof Stats; amount: number }
  condition?: number
  stress?: number
}

export const BERRIES: readonly Berry[] = [
  {
    key: 'oran',
    name: '오랭열매',
    price: 320,
    effect: '체력 +3',
    stat: { key: 'hp', amount: 3 },
  },
  {
    key: 'liechi',
    name: '리리바열매',
    price: 320,
    effect: '공격 +3',
    stat: { key: 'attack', amount: 3 },
  },
  {
    key: 'ganlon',
    name: '우무열매',
    price: 320,
    effect: '방어 +3',
    stat: { key: 'defense', amount: 3 },
  },
  {
    key: 'petaya',
    name: '마루비열매',
    price: 320,
    effect: '특수공격 +3',
    stat: { key: 'special', amount: 3 },
  },
  {
    key: 'apicot',
    name: '아파코열매',
    price: 320,
    effect: '특수방어 +3',
    stat: { key: 'specialDefense', amount: 3 },
  },
  {
    key: 'salac',
    name: '미캉열매',
    price: 320,
    effect: '스피드 +3',
    stat: { key: 'speed', amount: 3 },
  },
  {
    key: 'sitrus',
    name: '리샘열매',
    price: 260,
    effect: '컨디션 +20',
    condition: 20,
  },
  {
    key: 'lum',
    name: '자뭉열매',
    price: 180,
    effect: '스트레스 -20',
    stress: -20,
  },
]

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** 먹고 난 뒤의 한마디 */
function afterTaste(berry: Berry): string {
  if (berry.stat) {
    const label = STAT_LABELS.find((s) => s.key === berry.stat!.key)?.label ?? '능력'
    return `${withJosa(label, '이', '가')} ${berry.stat.amount} 올랐다!`
  }
  if (berry.condition) return '몸이 한결 가벼워졌다.'
  if (berry.stress) return '마음이 조금 놓인 듯하다.'
  return '맛있게 먹었다.'
}

export interface PurchaseResult {
  state: RaisingState
  /** 화면에 한 줄로 내보일 말 */
  message: string
}

/** 살 수 있는지 */
export function canAfford(state: RaisingState, berry: Berry): boolean {
  return state.money >= berry.price
}

/**
 * 열매 하나를 사서 그 자리에서 먹입니다.
 * 사 준 것을 알아보기 때문에 어느 열매든 친밀도가 조금 오릅니다.
 */
export function buyBerry(state: RaisingState, berry: Berry, name: string): PurchaseResult {
  const stats = { ...state.stats }
  if (berry.stat) {
    stats[berry.stat.key] = clamp(stats[berry.stat.key] + berry.stat.amount, 0, STAT_MAX)
  }
  stats.bond = clamp(stats.bond + 1, 0, STAT_MAX)

  return {
    state: {
      ...state,
      money: state.money - berry.price,
      stats,
      condition: clamp(state.condition + (berry.condition ?? 0), 0, 100),
      stress: clamp(state.stress + (berry.stress ?? 0), 0, 100),
    },
    message: `${withJosa(name, '이', '가')} ${withJosa(berry.name, '을', '를')} 먹었다. ${afterTaste(berry)}`,
  }
}

/** 상점 칸에 놓는 아이콘의 텍스처 키 */
export const berryIconKey = (key: string): string => `berry-${key}`
