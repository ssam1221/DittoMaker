import type { Npc } from './npc'
import { STAT_LABELS, type Stats } from './raising'

/**
 * 체육관에서 만나는 포켓몬들.
 *
 * 옛 육성 시뮬레이션에서 성에 드나들며 사람들을 만나던 것과 같습니다.
 * 다만 여기서는 아무나 상대해 주지 않습니다. 능력치 총합이 그만큼은
 * 되어야 말이라도 붙여 주므로, 약한 쪽부터 차례로 열립니다.
 *
 * 필요한 총합은 그 포켓몬의 종족값을 그대로 쓰지 않고, 한 판(열 해)
 * 동안 고르게 만나도록 늘려 잡았습니다. 처음 총합이 120 이고 수업
 * 한 달이 열 남짓 올리므로, 잉어킹은 두어 달이면 만나고 망나뇽은
 * 막바지에야 만납니다.
 */

export interface Challenger extends Npc {
  /** 상대해 주는 데 필요한 능력치 총합 */
  need: number
  lines: readonly string[]
}

export const CHALLENGERS: readonly Challenger[] = [
  {
    key: 'magikarp',
    name: '잉어킹',
    role: '연못의 터줏대감',
    cry: '0129-잉어킹',
    need: 150,
    lines: [
      '뻐끔. 뻐끔. …무슨 말인지는 모르겠지만, 반가워하는 것 같다.',
      '뻐끔뻐끔! 잉어킹이 힘차게 튀어올랐다. 그것뿐이다.',
    ],
  },
  {
    key: 'rattata',
    name: '꼬렛',
    role: '체육관 잡일꾼',
    cry: '0019-꼬렛',
    need: 240,
    lines: [
      '여긴 처음이지? 관장님은 저 안쪽에 계셔.',
      '몸부터 풀고 와. 다치면 손해는 네 쪽이야.',
      '작다고 얕보지 마. 이빨은 매일 갈고 있으니까.',
    ],
  },
  {
    key: 'onix',
    name: '롱스톤',
    role: '바위 담당',
    cry: '0095-롱스톤',
    need: 380,
    lines: [
      '바위는 서두르지 않는다. 너도 그러면 된다.',
      '단단해지고 싶다면 먼저 오래 버티는 법을 배워라.',
      '땅속은 조용하지. 가끔은 그런 데서 생각을 정리하는 것도 좋다.',
    ],
  },
  {
    key: 'marowak',
    name: '텅구리',
    role: '뼈다귀 수련생',
    cry: '0105-텅구리',
    need: 520,
    lines: [
      '이 뼈다귀는 어머니가 주신 거야. 함부로 만지지 마.',
      '휘두르는 건 힘이 아니라 요령이야. 잘 봐 둬.',
      '슬픔을 등에 지고도 걸을 수 있다면, 그게 강한 거다.',
    ],
  },
  {
    key: 'hitmonchan',
    name: '홍수몬',
    role: '펀치 담당',
    cry: '0107-홍수몬',
    need: 660,
    lines: [
      '주먹은 내지르는 것보다 거두는 게 어렵지.',
      '세 발짝. 그 안에 들어오면 이미 늦은 거다.',
      '쉬는 것도 훈련이야. 오늘은 그만 돌아가도 좋다.',
    ],
  },
  {
    key: 'tauros',
    name: '켄타로스',
    role: '돌진 담당',
    cry: '0128-켄타로스',
    need: 800,
    lines: [
      '멈추는 법을 모르면 달릴 자격도 없다.',
      '겁먹지 않는군. 그거면 됐다.',
      '한번 정한 방향으로는 끝까지 간다. 그뿐이다.',
    ],
  },
  {
    key: 'alakazam',
    name: '후딘',
    role: '체육관 부관장',
    cry: '0065-후딘',
    need: 950,
    lines: [
      '네 안의 수치는 이미 읽었다. 여기까지 온 것만으로 대단하지.',
      '스푼은 굽히는 것이 아니라 굽어지는 것이다. 알겠나?',
      '무엇이 될지 정하지 않았다고 했지. 그것이 네 가장 큰 힘이다.',
    ],
  },
  {
    key: 'dragonite',
    name: '망나뇽',
    role: '체육관 관장',
    cry: '0149-망나뇽',
    need: 1100,
    lines: [
      '먼 바다에서 여기까지, 잘 왔다.',
      '이제 내게 배울 것은 없다. 네가 스스로 정하면 된다.',
      '언젠가 네가 무엇이 되든, 오늘 여기 온 것은 잊지 마라.',
    ],
  },
]

/** 화면에 내보이는 여섯 능력치의 합. 친밀도는 세지 않습니다. */
export function statTotal(stats: Stats): number {
  return STAT_LABELS.reduce((sum, stat) => sum + (stats[stat.key] ?? 0), 0)
}

/** 그 포켓몬이 상대해 주는지 */
export function opensTo(challenger: Challenger, total: number): boolean {
  return total >= challenger.need
}

/** 지금 건넬 말 한 줄 */
export function lineFrom(challenger: Challenger): string {
  const lines = challenger.lines
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0]!
}
