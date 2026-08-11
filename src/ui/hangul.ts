/**
 * 자모를 골라 한글 음절을 만듭니다.
 *
 * 유니코드 한글 음절은 초성·중성·종성 순번으로 계산됩니다.
 *   음절 = 0xAC00 + (초성 * 21 + 중성) * 28 + 종성
 */

const BASE = 0xac00
const JUNG_COUNT = 21
const JONG_COUNT = 28

/** 초성 19자 */
export const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

/** 중성 21자 */
export const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const

/** 종성 27자 (0번은 받침 없음이라 목록에서 뺐습니다) */
export const JONGSEONG = [
  'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ',
  'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

/**
 * 초성·중성·종성 순번으로 음절 한 글자를 만듭니다.
 * jong 은 0 이 받침 없음이고, JONGSEONG 배열의 n 번째는 n+1 입니다.
 */
export function composeSyllable(cho: number, jung: number, jong = 0): string {
  return String.fromCharCode(BASE + (cho * JUNG_COUNT + jung) * JONG_COUNT + jong)
}

/**
 * 화면에서 자모를 눌러 이름을 만드는 상태를 들고 있습니다.
 *
 * 초성 -> 중성 -> (받침) 순서로 쌓이고, 받침을 고르거나 새 초성을 고르면
 * 앞 글자가 확정됩니다. 참고한 화면처럼 자모 묶음이 초성/중성/종성으로
 * 나뉘어 있어 어느 자리에 넣을지 헷갈릴 일이 없습니다.
 */
export class NameComposer {
  private committed = ''
  private cho: number | null = null
  private jung: number | null = null

  constructor(private readonly maxLength: number) {}

  /** 확정된 글자 + 조합 중인 글자 */
  get text(): string {
    return this.committed + this.pending
  }

  /** 아직 확정되지 않은 한 글자 (초성만 눌린 상태면 자모 그대로) */
  get pending(): string {
    if (this.cho === null) return ''
    if (this.jung === null) return CHOSEONG[this.cho]!
    return composeSyllable(this.cho, this.jung)
  }

  get length(): number {
    return this.text.length
  }

  get isFull(): boolean {
    return this.length >= this.maxLength
  }

  pickChoseong(index: number): void {
    // 앞 글자가 조합 중이었다면 받침 없이 확정하고 새 글자를 시작합니다.
    this.commitPending()
    if (this.committed.length >= this.maxLength) return

    this.cho = index
    this.jung = null
  }

  pickJungseong(index: number): void {
    if (this.cho === null) return
    this.jung = index
  }

  pickJongseong(index: number): void {
    if (this.cho === null || this.jung === null) return

    this.committed += composeSyllable(this.cho, this.jung, index + 1)
    this.cho = null
    this.jung = null
  }

  /** 한 번에 하나씩 되돌립니다: 받침 -> 중성 -> 초성 -> 앞 글자 */
  backspace(): void {
    if (this.jung !== null) {
      this.jung = null
      return
    }
    if (this.cho !== null) {
      this.cho = null
      return
    }
    this.committed = this.committed.slice(0, -1)
  }

  clear(): void {
    this.committed = ''
    this.cho = null
    this.jung = null
  }

  /**
   * 값을 통째로 갈아끼웁니다. 키보드로 직접 친 글자는 브라우저가 이미
   * 조합을 끝내 놓았으므로, 조합 상태 없이 확정된 글자로만 둡니다.
   */
  setText(value: string): void {
    this.committed = value.slice(0, this.maxLength)
    this.cho = null
    this.jung = null
  }

  /** 조합 중인 글자를 받침 없이 확정합니다. */
  commitPending(): void {
    if (this.cho === null) return

    if (this.jung === null) {
      // 초성만 눌린 채로 끝나면 자모 한 글자로 남깁니다.
      this.committed += CHOSEONG[this.cho]
    } else {
      this.committed += composeSyllable(this.cho, this.jung)
    }

    this.cho = null
    this.jung = null
  }
}
