import type { RaisingState } from './raising'
import { withJosa } from './ui/hangul'

/**
 * 말을 걸었을 때 메타몽이 보이는 반응.
 *
 * 말투마다 후보를 여러 개 두고, 그때의 상태에 맞는 것을 고릅니다.
 * 조건이 붙은 것을 먼저 살피고 아무것도 걸리지 않으면 기본 반응이 나옵니다.
 * 앞으로 능력치나 타입 적성에 따른 반응을 늘릴 때도 목록에 한 줄만 더하면 됩니다.
 */

export type TalkTone = 'greet' | 'kind' | 'stern'

export const TALK_TONES: ReadonlyArray<{ tone: TalkTone; label: string; detail: string }> = [
  { tone: 'greet', label: '인사', detail: '가볍게 말을 건넨다.' },
  { tone: 'kind', label: '다정하게', detail: '따뜻하게 어루만진다.' },
  { tone: 'stern', label: '엄하게', detail: '단호하게 타이른다.' },
]

export interface TalkContext {
  state: RaisingState
  /** 지어 준 이름 */
  name: string
}

interface TalkLine {
  /** 이 반응이 나올 조건. 없으면 언제나 후보입니다. */
  when?: (ctx: TalkContext) => boolean
  say: (ctx: TalkContext) => string
}

const tired = ({ state }: TalkContext): boolean => state.condition < 35 || state.stress > 65
const close = ({ state }: TalkContext): boolean => state.stats.bond >= 70
const distant = ({ state }: TalkContext): boolean => state.stats.bond < 35

/**
 * 이름 뒤 조사는 받침을 보고 골라야 합니다.
 * 지어 준 이름이 무엇이든 "말랑이가", "메타몽이" 처럼 읽히게 합니다.
 */
const ga = (name: string): string => withJosa(name, '이', '가')
const neun = (name: string): string => withJosa(name, '은', '는')

/** 조건이 붙은 것을 먼저, 기본 반응을 마지막에 둡니다. */
const LINES: Record<TalkTone, readonly TalkLine[]> = {
  greet: [
    {
      when: tired,
      say: ({ name }) => `${neun(name)} 눈만 겨우 들어 올렸다. 많이 지쳐 있다.`,
    },
    {
      when: close,
      say: ({ name }) => `${ga(name)} 통통 튀어오르며 온몸으로 반겼다.`,
    },
    {
      when: distant,
      say: ({ name }) => `${neun(name)} 잠깐 이쪽을 보더니 다시 제자리로 돌아갔다.`,
    },
    {
      say: ({ name }) => `${ga(name)} 몸을 한 번 출렁여 인사했다.`,
    },
  ],
  kind: [
    {
      when: tired,
      say: ({ name }) => `${ga(name)} 말없이 몸을 기대 왔다. 쉬게 해 주는 편이 좋겠다.`,
    },
    {
      when: close,
      say: ({ name }) => `${ga(name)} 스르르 다가와 발치에 눌러앉았다.`,
    },
    {
      when: distant,
      say: ({ name }) => `${neun(name)} 조심스레 거리를 두었다. 아직은 서먹한 모양이다.`,
    },
    {
      say: ({ name }) => `${ga(name)} 기분 좋은 듯 천천히 물결쳤다.`,
    },
  ],
  stern: [
    {
      when: tired,
      say: ({ name }) => `${ga(name)} 움츠러들었다. 지금은 다그칠 때가 아닌 것 같다.`,
    },
    {
      when: close,
      say: ({ name }) => `${neun(name)} 잠깐 굳었다가, 이내 몸을 곧게 폈다.`,
    },
    {
      when: distant,
      say: ({ name }) => `${neun(name)} 딴 곳을 보며 못 들은 척했다.`,
    },
    {
      say: ({ name }) => `${ga(name)} 자세를 고쳐 잡고 이쪽을 바라보았다.`,
    },
  ],
}

export function replyTo(tone: TalkTone, ctx: TalkContext): string {
  const candidates = LINES[tone]
  const line = candidates.find((c) => c.when?.(ctx)) ?? candidates[candidates.length - 1]

  return line?.say(ctx) ?? ''
}
