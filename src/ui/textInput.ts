/**
 * 캔버스 위에 보이지 않는 입력창을 띄워 키보드 입력을 받습니다.
 *
 * 한글은 브라우저 입력 계층에서 조합되기 때문에 keydown 만으로는
 * 완성된 글자를 알 수 없습니다. 실제 <input> 에 IME 가 붙어야 "ㄱ+ㅏ"
 * 가 "가" 로 합쳐집니다. 그래서 화면에는 안 보이는 입력창을 두고
 * 그 값만 읽어 게임 글자로 그립니다.
 */

export interface TextInputOptions {
  maxLength: number
  /** 숫자만 받을지 */
  numeric?: boolean
  /** 값이 바뀔 때마다 (조합 중인 글자 포함) */
  onChange: (value: string) => void
  /** Enter */
  onSubmit: () => void
  /** Space — 화면 자판에서 커서가 놓인 글자를 누릅니다 */
  onActivate: () => void
  /** 방향키 */
  onMove: (dx: number, dy: number) => void
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export class HiddenTextInput {
  private readonly el: HTMLInputElement
  private readonly options: TextInputOptions

  constructor(options: TextInputOptions) {
    this.options = options

    const el = document.createElement('input')
    el.type = 'text'
    el.autocomplete = 'off'
    el.spellcheck = false
    el.maxLength = options.maxLength
    if (options.numeric) el.inputMode = 'numeric'

    // 눈에 띄지 않되 초점은 받을 수 있어야 합니다. display:none 이나
    // visibility:hidden 은 초점을 받지 못해 IME 가 붙지 않습니다.
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      top: '58%',
      width: '220px',
      height: '28px',
      transform: 'translateX(-50%)',
      opacity: '0',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      // 조합 중인 글자가 캔버스 위에 겹쳐 보이지 않도록
      color: 'transparent',
      caretColor: 'transparent',
      zIndex: '10',
    } satisfies Partial<CSSStyleDeclaration>)

    el.addEventListener('input', () => this.emitChange())
    el.addEventListener('keydown', (event) => this.onKeyDown(event))
    // 다른 곳을 눌러 초점을 잃어도 다시 가져옵니다.
    el.addEventListener('blur', () => window.setTimeout(() => el.focus(), 0))

    document.body.appendChild(el)
    this.el = el
    el.focus()
  }

  private clean(value: string): string {
    if (!this.options.numeric) {
      return value.replace(/\s+/g, '').slice(0, this.options.maxLength)
    }

    // 숫자만, 0 으로 시작하지 않게
    return value
      .replace(/\D+/g, '')
      .replace(/^0+/, '')
      .slice(0, this.options.maxLength)
  }

  private emitChange(): void {
    const cleaned = this.clean(this.el.value)
    if (cleaned !== this.el.value) this.el.value = cleaned
    this.options.onChange(cleaned)
  }

  private onKeyDown(event: KeyboardEvent): void {
    // 조합 중에는 방향키·Enter 가 IME 후보 선택에 쓰입니다. 건드리지 않습니다.
    if (event.isComposing) return

    const arrow = ARROWS[event.key]
    if (arrow) {
      event.preventDefault()
      event.stopPropagation()
      this.options.onMove(arrow[0], arrow[1])
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      this.options.onSubmit()
      return
    }

    if (event.key === ' ') {
      // 이름에 공백을 넣을 일이 없으므로 화면 자판을 누르는 키로 씁니다.
      event.preventDefault()
      event.stopPropagation()
      this.options.onActivate()
      return
    }

    // Backspace 등 나머지는 입력창이 처리합니다. 다만 게임 쪽 단축키와
    // 겹치지 않도록 여기서 막아 둡니다.
    event.stopPropagation()
  }

  /** 화면 자판으로 값이 바뀌었을 때 입력창을 맞춰 둡니다. */
  setValue(value: string): void {
    this.el.value = value
  }

  focus(): void {
    this.el.focus()
  }

  destroy(): void {
    this.el.remove()
  }
}
