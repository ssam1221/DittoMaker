import type { Npc } from './npc'
import { STAT_LABELS, STAT_MAX, TYPE_MAX, TYPES, type RaisingState, type TypeKey } from './raising'
import { withJosa } from './ui/hangul'

/**
 * 어쩌다 한 번 문을 두드리는 비밀 상인.
 *
 * 옛 육성 시뮬레이션에서 이따금 찾아와 수상한 물건을 늘어놓던 행상인
 * 자리입니다. 마을 상점처럼 늘 열려 있지 않고 한 달에 한 번 올까 말까
 * 하는 대신, 파는 것이 다릅니다.
 *
 * - 배틀에서 쓰던 보조 도구는 능력치를 한 번에 크게 올립니다.
 * - 진화의돌은 마을 어디서도 팔지 않는 것 — 타입 적성을 올립니다.
 *   메타몽이 무엇에 가까워질지를 돈으로 미는 셈입니다.
 * - 그리고 아무도 사지 못할 물건 둘. 옛 게임의 행상인이 늘 그랬듯이.
 */

export const MERCHANT: Npc = {
  key: 'drowzee',
  name: '슬리프',
  role: '떠돌이 장수',
  cry: '0096-슬리프',
}

export interface Goods {
  key: string
  name: string
  price: number
  /** 칸 아래 줄에 한 줄로 보이는 효과 */
  effect: string
  /** 고르면 나오는 한마디 */
  patter: string
  stat?: { key: (typeof STAT_LABELS)[number]['key']; amount: number }
  /** 여섯 능력치를 한꺼번에 */
  allStats?: number
  /** 어느 능력치가 오를지는 사 봐야 압니다. */
  randomStat?: number
  /** 타입 적성 */
  type?: { key: TypeKey; amount: number }
}

const X_PRICE = 900
const STONE_PRICE = 2500

export const GOODS: readonly Goods[] = [
  {
    key: 'xattack',
    name: '플러스파워',
    price: X_PRICE,
    effect: '공격 +8',
    patter: '팔뚝에 힘이 도는 물건이지. 한 번 써 보면 알아.',
    stat: { key: 'attack', amount: 8 },
  },
  {
    key: 'xdefense',
    name: '디펜드업',
    price: X_PRICE,
    effect: '방어 +8',
    patter: '맞아도 덜 아프게 해 주는 거야. 손해 볼 일은 없지.',
    stat: { key: 'defense', amount: 8 },
  },
  {
    key: 'xspatk',
    name: '스페셜업',
    price: X_PRICE,
    effect: '특수공격 +8',
    patter: '머릿속이 환해진다고들 하더군. 나는 안 써 봤네만.',
    stat: { key: 'special', amount: 8 },
  },
  {
    key: 'xspdef',
    name: '스페셜가드',
    price: X_PRICE,
    effect: '특수방어 +8',
    patter: '이상한 것에 홀리지 않게 해 주지. 나 같은 놈한테도 말이야.',
    stat: { key: 'specialDefense', amount: 8 },
  },
  {
    key: 'xspeed',
    name: '스피더',
    price: X_PRICE,
    effect: '스피드 +8',
    patter: '발이 가벼워져. 도망칠 일이 있을 때 요긴하다네.',
    stat: { key: 'speed', amount: 8 },
  },
  {
    key: 'xaccuracy',
    name: '잘-맞히기',
    price: 1400,
    effect: '모든 능력치 +2',
    patter: '빗나가지 않게 되면 말이야, 무엇을 해도 조금씩 늘거든.',
    allStats: 2,
  },
  {
    key: 'direhit',
    name: '크리티컬커터',
    price: 1600,
    effect: '무작위 능력치 +15',
    patter: '어디에 꽂힐지는 나도 몰라. 그게 재미 아니겠나?',
    randomStat: 15,
  },

  // --- 진화의돌 ---
  {
    key: 'firestone',
    name: '불꽃의돌',
    price: STONE_PRICE,
    effect: '불꽃 적성 +25',
    patter: '쥐고 있으면 손이 따뜻해. 겨울에도 팔린다네.',
    type: { key: 'fire', amount: 25 },
  },
  {
    key: 'waterstone',
    name: '물의돌',
    price: STONE_PRICE,
    effect: '물 적성 +25',
    patter: '들여다보면 안에서 물결이 친다네. 오래 보면 어지럽지.',
    type: { key: 'water', amount: 25 },
  },
  {
    key: 'thunderstone',
    name: '천둥의돌',
    price: STONE_PRICE,
    effect: '전기 적성 +25',
    patter: '가끔 저 혼자 튄다네. 조심해서 받게.',
    type: { key: 'electric', amount: 25 },
  },
  {
    key: 'leafstone',
    name: '리프의돌',
    price: STONE_PRICE,
    effect: '풀 적성 +25',
    patter: '숲 냄새가 나지? 어디서 났는지는 묻지 말게.',
    type: { key: 'grass', amount: 25 },
  },
  {
    key: 'moonstone',
    name: '문의돌',
    price: 3000,
    effect: '페어리 적성 +25',
    patter: '달이 없는 밤에만 캐는 물건이야. 그래서 비싸.',
    type: { key: 'fairy', amount: 25 },
  },

  // --- 수상한 것 둘 ---
  {
    key: 'fullincense',
    name: '풍유환',
    price: 12000,
    effect: '체력 +15',
    patter: '먼 나라에서 가져온 진귀한 물건이라네. 몸이 한 뼘 부푼다지.',
    stat: { key: 'hp', amount: 15 },
  },
  {
    key: 'slowpoketail',
    name: '야돈의꼬리',
    price: 1000000,
    effect: '모든 능력치 +10',
    patter: '값? 백만이야. …농담 아닐세. 사겠다는 사람이 없어서 늘 갖고 다니지.',
    allStats: 10,
  },
]

export function findGoods(key: string): Goods | undefined {
  return GOODS.find((goods) => goods.key === key)
}

/** 상점 칸에 놓는 아이콘의 텍스처 키 — 열매와 같은 폴더를 씁니다. */
export const goodsIconKey = (key: string): string => `berry-${key}`

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export function canAfford(state: RaisingState, goods: Goods): boolean {
  return state.money >= goods.price
}

export interface PurchaseResult {
  state: RaisingState
  message: string
}

function pickStat(): (typeof STAT_LABELS)[number]['key'] {
  const chosen = STAT_LABELS[Math.floor(Math.random() * STAT_LABELS.length)]
  return chosen?.key ?? 'hp'
}

/** 산 물건을 그 자리에서 씁니다. 열매와 마찬가지로 가방은 두지 않습니다. */
export function buyGoods(state: RaisingState, goods: Goods, name: string): PurchaseResult {
  const stats = { ...state.stats }
  const types = { ...state.types }
  let told = '잘 샀네.'

  if (goods.stat) {
    stats[goods.stat.key] = clamp(stats[goods.stat.key] + goods.stat.amount, 0, STAT_MAX)
    told = `${label(goods.stat.key)} ${goods.stat.amount} 올랐다!`
  }

  if (goods.allStats) {
    for (const stat of STAT_LABELS) {
      stats[stat.key] = clamp(stats[stat.key] + goods.allStats, 0, STAT_MAX)
    }
    told = `모든 능력치가 ${goods.allStats} 씩 올랐다!`
  }

  if (goods.randomStat) {
    const key = pickStat()
    stats[key] = clamp(stats[key] + goods.randomStat, 0, STAT_MAX)
    told = `${label(key)} ${goods.randomStat} 올랐다!`
  }

  if (goods.type) {
    types[goods.type.key] = clamp(types[goods.type.key] + goods.type.amount, 0, TYPE_MAX)
    const typeName = TYPES.find((type) => type.key === goods.type!.key)?.label ?? '어떤'
    told = `${typeName} 적성이 ${goods.type.amount} 올랐다!`
  }

  return {
    state: { ...state, money: state.money - goods.price, stats, types },
    message: `${withJosa(name, '이', '가')} ${withJosa(goods.name, '을', '를')} 썼다. ${told}`,
  }
}

/** '체력이' 처럼 조사까지 붙인 능력치 이름 */
function label(key: (typeof STAT_LABELS)[number]['key']): string {
  const found = STAT_LABELS.find((stat) => stat.key === key)?.label ?? '능력'
  return withJosa(found, '이', '가')
}

/** 문을 두드리며 건네는 첫마디 */
const KNOCKS: readonly string[] = [
  '안녕하슈, 주인장. 먼 데서 좋은 물건 좀 가져왔는데 보고 가려나?',
  '허허, 오늘은 짐이 무거워서 말이야. 좀 덜어 주지 않겠나?',
  '쉿— 이건 아무한테나 안 보여 주는 거라네. 잠깐만 보고 가게.',
]

export function knock(): string {
  return KNOCKS[Math.floor(Math.random() * KNOCKS.length)] ?? KNOCKS[0]!
}
