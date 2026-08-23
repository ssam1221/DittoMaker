/**
 * 수업과 일자리를 맡고 있는 포켓몬들.
 *
 * 일정 한 칸을 시작할 때마다 담당 포켓몬이 나와 한마디를 건네고,
 * 그 칸을 마치면 다시 나와 작별 인사를 합니다.
 * 아르세우스와 나누던 대화와 같은 창을 쓰되, 말은 한 줄로 짧게 끝냅니다.
 *
 * 그림은 public/assets/pokemon/npc/<key>.png,
 * 대화창에 넣을 얼굴은 scripts/make-npc-portraits.mjs 로 잘라 둔
 * public/assets/pokemon/portrait/npc/<key>.png 를 씁니다.
 *
 * 아직 담당이 없는 수업은 그냥 넘어갑니다. 그림이 생기면 여기에
 * 한 칸만 더하면 그날부터 그 수업에도 선생이 생깁니다.
 */

export interface Npc {
  /** 그림·초상화 파일 이름 */
  key: string
  name: string
  /** 이름 아래 붙는 한 줄 */
  role: string
  /** 울음소리 파일 이름 (public/sfx/voice/ 기준) */
  cry: string
}

export const NPCS = {
  cook: { key: 'cook', name: '요씽리스', role: '요리 선생', cry: '0820-요씽리스' },
  art: { key: 'art', name: '루브도', role: '미술 선생', cry: '0235-루브도' },
  music: { key: 'music', name: '로토무', role: '음악 선생', cry: '0479-로토무' },
  prof: { key: 'prof', name: '덩쿠림보', role: '약학 선생', cry: '0465-덩쿠림보' },
  nurse: { key: 'nurse', name: '럭키', role: '포켓몬센터 접수', cry: '0113-럭키' },
  clerk: { key: 'clerk', name: '나옹', role: '프렌들리숍 점원', cry: '0052-나옹' },
  oldstory: { key: 'oldstory', name: '잠만보', role: '이야기꾼', cry: '0143-잠만보' },
  build: { key: 'build', name: '두드리짱', role: '현장 반장', cry: '0959-두드리짱' },
} as const satisfies Record<string, Npc>

export type NpcKey = keyof typeof NPCS

/**
 * 무엇을 할 때 누가 나오는지, 그리고 무슨 말을 건네는지.
 *
 * 같은 포켓몬이라도 자리가 다르면 말이 달라집니다. 요씽리스는
 * 요리 수업에서는 선생이지만 식당에서는 같이 일하는 사람입니다.
 */
interface Assignment {
  npc: NpcKey
  /** 일정을 시작할 때 건네는 인사 */
  lines: readonly string[]
  /** 한 달을 마치고 헤어질 때 */
  farewells: readonly string[]
}

const BY_ACTIVITY: Readonly<Record<string, Assignment>> = {
  // --- 수업 ---
  cooking: {
    npc: 'cook',
    lines: [
      '오늘도 맛있는 요리 수업을 진행해 봐요!',
      '불 앞은 뜨거우니까, 소매부터 걷고 시작하죠.',
      '맛은 나중 일이에요. 손 다치지 않는 것부터 배웁시다.',
    ],
    farewells: [
      '오늘은 여기까지! 다음엔 더 어려운 걸 해 봐요.',
      '수고했어요. 손 씻고 가는 거 잊지 말고요!',
    ],
  },
  art: {
    npc: 'art',
    lines: [
      '오늘은 무엇을 그려 볼까요. 마음에 드는 걸로 골라 봐요.',
      '틀리게 그려도 괜찮아요. 붓은 지우개보다 너그럽거든요.',
      '색은 섞을수록 탁해져요. 아까울 때 멈추는 게 요령이에요.',
    ],
    farewells: [
      '오늘 그린 건 가져가요. 다음에 또 봐요.',
      '수고했어요. 붓은 제가 씻어 둘게요.',
    ],
  },
  music: {
    npc: 'music',
    lines: [
      '자, 소리를 맞춰 볼까요. 하나, 둘—',
      '박자는 몸으로 세는 거예요. 어깨에 힘을 빼고요.',
      '오늘은 조금 크게 틀어 볼게요. 놀라지 말아요!',
    ],
    farewells: [
      '오늘은 여기까지! 다음에 또 맞춰 봐요.',
      '수고했어요. 그 박자, 잊지 말고요!',
    ],
  },
  pharmacy: {
    npc: 'prof',
    lines: [
      '이로운 풀과 해로운 풀은 생김새가 닮았단다. 잘 보거라.',
      '약도 지나치면 독이 되지. 오늘은 그 경계를 배운다.',
      '손부터 씻고 오렴. 약학은 거기서 시작이란다.',
    ],
    farewells: [
      '수고했다. 오늘 배운 건 잊지 말거라.',
      '다음에 또 오렴. 그때는 다른 풀을 보자꾸나.',
    ],
  },
  folklore: {
    npc: 'oldstory',
    lines: [
      '…음냐. 아, 왔구나. 오늘은 용에 관한 이야기란다.',
      '옛이야기는 서두르면 재미가 없지. 천천히 듣거라.',
      '졸리면 졸아도 좋아. 좋은 이야기는 꿈에서도 이어지니까.',
    ],
    farewells: [
      '오늘 이야기는 여기까지. 다음에 또 오려무나.',
      '수고했다. 뒷이야기는 다음에 해 주마.',
    ],
  },

  // --- 일자리 ---
  diner: {
    npc: 'cook',
    lines: [
      '홀은 제가 볼 테니, 그릇 쪽을 부탁해요!',
      '점심때는 정신이 하나도 없어요. 발밑 조심하고요.',
    ],
    farewells: [
      '오늘 고생했어요! 남은 건 싸 줄게요.',
      '수고했어요. 내일도 이만큼만 부탁해요!',
    ],
  },
  mine: {
    npc: 'build',
    lines: [
      '망치는 힘으로 드는 게 아니야. 자, 따라 해 봐!',
      '오늘 캘 만큼만 캔다. 욕심내면 무너지거든.',
      '머리부터 챙기고. 그럼 들어가자!',
    ],
    farewells: [
      '오늘 몫은 다 했다. 수고했어!',
      '잘 쉬어 둬라. 다음에 또 보자고.',
    ],
  },
}

export interface Greeting {
  npc: Npc
  line: string
}

/** 그 활동을 맡은 포켓몬. 없으면 아무도 나오지 않습니다. */
export function npcFor(activityKey: string): Npc | undefined {
  const assignment = BY_ACTIVITY[activityKey]
  return assignment ? NPCS[assignment.npc] : undefined
}

/**
 * 짜 놓은 일정의 칸마다 나올 사람과 할 말을 뽑습니다.
 *
 * 칸 순서에 맞춰 돌려주므로, 담당이 없는 칸은 그 자리가 비어 있습니다.
 * 한 달에 같은 수업을 두 번 넣을 수도 있으니 이미 쓴 말은 빼고 고르고,
 * 후보를 다 쓰면 처음부터 다시 돌려 씁니다.
 */
function pick(
  plan: readonly string[],
  which: 'lines' | 'farewells',
): Array<Greeting | undefined> {
  const used = new Map<string, Set<number>>()

  return plan.map((key) => {
    const assignment = BY_ACTIVITY[key]
    if (!assignment) return undefined

    const lines = assignment[which]
    const memo = `${key}:${which}`

    const seen = used.get(memo) ?? new Set<number>()
    if (seen.size >= lines.length) seen.clear()

    const rest = lines.map((_, index) => index).filter((index) => !seen.has(index))
    const chosen = rest[Math.floor(Math.random() * rest.length)] ?? 0

    seen.add(chosen)
    used.set(memo, seen)

    return { npc: NPCS[assignment.npc], line: lines[chosen]! }
  })
}

/** 칸을 시작할 때 건네는 인사 */
export function greetingsForPlan(plan: readonly string[]): Array<Greeting | undefined> {
  return pick(plan, 'lines')
}

/** 칸을 마치고 헤어질 때 건네는 인사 */
export function farewellsForPlan(plan: readonly string[]): Array<Greeting | undefined> {
  return pick(plan, 'farewells')
}

/** 대화창에 쓰는 텍스처 키 — 도감 그림과 겹치지 않게 접두사를 붙입니다. */
export const npcArtKey = (key: string): string => `npc-${key}`
export const npcPortraitKey = (key: string): string => `npc-face-${key}`
export const npcCryKey = (key: string): string => `npc-cry-${key}`

/**
 * 마을의 건물마다 문 앞에서 맞아 주는 포켓몬.
 *
 * 같은 포켓몬이라도 자리가 다르면 부르는 이름이 달라지므로 (덩쿠림보는
 * 수업에서는 약학 선생이지만 연구소에서는 소장입니다) 여기서 역할을
 * 덮어씁니다. 건물 안은 아직 없어서 지금은 인사만 하고 물러납니다.
 */
interface Host {
  npc: NpcKey
  /** 그 자리에서만 쓰는 호칭. 없으면 NPCS 의 것을 그대로 씁니다. */
  role?: string
  lines: readonly string[]
}

const HOSTS: Readonly<Record<string, Host>> = {
  center: {
    npc: 'nurse',
    lines: [
      '어서 오세요! 포켓몬센터에 오신 것을 환영합니다.',
      '어서 오세요. 오늘은 그 아이 얼굴빛이 좋아 보이네요.',
      '어서 오세요! 쉬어 가실 거라면 얼마든지요.',
    ],
  },
  shop: {
    npc: 'clerk',
    lines: [
      '어서 옵쇼! 오늘은 뭘 찾으러 왔냐옹?',
      '어서 옵쇼! 좋은 물건 많이 들어왔다옹.',
      '어서 옵쇼! 구경만 해도 괜찮다옹.',
    ],
  },
  lab: {
    npc: 'prof',
    role: '연구소장',
    lines: [
      '오, 왔구나. 그 아이가 어디까지 자랐는지 한번 보자꾸나.',
      '어서 오렴. 오늘은 무엇이 궁금해서 왔느냐?',
      '왔구나. 자료는 늘 여기 있으니 편히 보거라.',
    ],
  },
}

/** 그 건물의 주인이 건네는 인사. 주인이 없는 건물이면 아무도 나오지 않습니다. */
export function hostGreeting(placeKey: string): Greeting | undefined {
  const host = HOSTS[placeKey]
  if (!host) return undefined

  const npc = NPCS[host.npc]
  const line = host.lines[Math.floor(Math.random() * host.lines.length)] ?? host.lines[0]!

  return { npc: host.role ? { ...npc, role: host.role } : npc, line }
}

/** 마을에서 맞아 주는 포켓몬들 — 마을 씬이 미리 받아 둘 목록입니다. */
export const HOST_NPCS: readonly Npc[] = [...new Set(Object.values(HOSTS).map((h) => h.npc))].map(
  (key) => NPCS[key],
)
