import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import {
  AudioKey,
  FontFamily,
  GAME_HEIGHT,
  GAME_WIDTH,
  MusicFile,
  SAVE_KEY,
  SceneKey,
} from '../constants'
import { createCalendar, type MonthDay } from '../ui/calendar'
import { FocusGrid } from '../ui/focus'
import { CHOSEONG, JONGSEONG, JUNGSEONG, NameComposer } from '../ui/hangul'
import { HiddenTextInput } from '../ui/textInput'
import {
  addChoice,
  addPrompt,
  drawInnerPanel,
  drawParchmentFrame,
  PanelColor,
  type InnerPanel,
} from '../ui/panel'

const MAX_NAME = 8

const PANEL: InnerPanel = { x: 90, y: 64, width: GAME_WIDTH - 180, height: 408 }

/** 자모 묶음 배치 */
const JAMO_TOP = 206
const JAMO_ROW = 34
const JAMO_COL = 42

const GROUPS = {
  cho: { x: 132, columns: 4 },
  jung: { x: 340, columns: 4 },
  jong: { x: 548, columns: 5 },
}

export interface SetupResult {
  /** New Game 을 누른 시점의 연도. 달력이 이 해를 기준으로 그려집니다. */
  year: number
  surname: string
  dittoName: string
  dittoBirthday: MonthDay
  age: number
  birthday: MonthDay
}

type Step = 'surname' | 'dittoName' | 'dittoBirthday' | 'age' | 'birthday'

const STEPS: readonly Step[] = ['surname', 'dittoName', 'dittoBirthday', 'age', 'birthday']

const PROMPTS: Record<Step, string> = {
  surname: '당신의 성은 무엇입니까? (8자이내)',
  dittoName: '메타몽의 이름을 지어 주세요. (8자이내)',
  dittoBirthday: '메타몽의 생일은 언제입니까?',
  age: '당신의 나이를 가르쳐 주세요.',
  birthday: '당신의 생일은 언제입니까?',
}

/** 단계마다 안쪽 판 색을 바꿔 화면이 단조롭지 않게 합니다. */
const COLORS: Record<Step, number> = {
  surname: PanelColor.Teal,
  dittoName: PanelColor.Wine,
  dittoBirthday: PanelColor.Wine,
  age: PanelColor.Teal,
  birthday: PanelColor.Teal,
}

/**
 * 게임을 시작할 때 이름·나이·생일을 고르는 화면입니다.
 * 옛 육성 시뮬레이션처럼 자모와 숫자를 하나씩 눌러 채웁니다.
 */
export class SetupScene extends Phaser.Scene {
  private stepIndex = 0
  private composer = new NameComposer(MAX_NAME)
  private ageText = ''
  private year = new Date().getFullYear()
  private readonly focus = new FocusGrid()
  /** 지금 입력 중인 값을 보여주는 글자 */
  private entry?: Phaser.GameObjects.Text
  /** 키보드로 직접 칠 때 쓰는 보이지 않는 입력창 */
  private textInput?: HiddenTextInput

  private answers: Partial<SetupResult> = {}

  constructor() {
    super(SceneKey.Setup)
  }

  preload(): void {
    this.load.audio(AudioKey.Setup, `music/${encodeURIComponent(MusicFile.Setup)}`)
  }

  create(): void {
    this.stepIndex = 0
    this.composer = new NameComposer(MAX_NAME)
    this.ageText = ''
    this.answers = {}

    // New Game 을 누른 지금이 이 판의 기준 해가 됩니다.
    this.year = new Date().getFullYear()

    playBgm(this, AudioKey.Setup)
    this.bindKeyboard()
    this.renderStep()

    // 입력창은 초점을 놓치면 스스로 되찾으므로, 씬을 떠날 때 반드시 치웁니다.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.textInput?.destroy()
      this.textInput = undefined
    })
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  private get step(): Step {
    return STEPS[this.stepIndex]!
  }

  /** 단계가 바뀔 때마다 화면을 통째로 다시 그립니다. */
  private renderStep(): void {
    // true 를 줘야 지운 오브젝트가 실제로 파괴됩니다. 그냥 지우면
    // 표시 목록에서만 빠지고 입력 판정은 그대로 남습니다.
    this.children.removeAll(true)
    this.focus.clear()

    // 글자를 받는 단계에서만 입력창을 띄웁니다.
    this.textInput?.destroy()
    this.textInput = undefined

    const step = this.step

    if (step === 'dittoBirthday' || step === 'birthday') {
      this.renderCalendarStep(step)
    } else {
      drawParchmentFrame(this)
      drawInnerPanel(this, PANEL, COLORS[step])
      addPrompt(this, PANEL, PROMPTS[step])

      if (step === 'age') {
        this.renderAgeStep()
      } else {
        this.renderNameStep()
      }
    }

    this.addKeyboardHint()
    this.focus.focusAt(0)
  }

  /**
   * 키는 씬이 시작될 때 한 번만 겁니다.
   *
   * 단계마다 다시 걸면 핸들러가 겹겹이 쌓입니다. this.input 과
   * this.input.keyboard 는 서로 다른 이미터라, 앞의 것을 비워도
   * 키보드 쪽 리스너는 그대로 남기 때문입니다. 바뀌는 것은 커서에
   * 등록된 항목뿐이므로 핸들러는 그대로 두면 됩니다.
   */
  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-LEFT', () => this.focus.move(-1, 0))
    keyboard.on('keydown-RIGHT', () => this.focus.move(1, 0))
    keyboard.on('keydown-UP', () => this.focus.move(0, -1))
    keyboard.on('keydown-DOWN', () => this.focus.move(0, 1))
    keyboard.on('keydown-ENTER', () => this.focus.activate())
    keyboard.on('keydown-SPACE', () => this.focus.activate())
    // 자주 쓰는 지우기는 따로 열어 둡니다.
    keyboard.on('keydown-BACKSPACE', () => this.erase())
  }

  private addKeyboardHint(): void {
    const typing = this.step !== 'dittoBirthday' && this.step !== 'birthday'
    const hint = typing
      ? '키보드로 바로 입력    방향키 이동    Space 선택    Enter 완성'
      : '방향키 이동    Enter 선택'

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, hint, {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#8a7a55',
      })
      .setOrigin(0.5, 1)
  }

  /** 커서에 등록하면서 고를 수 있는 글자를 만듭니다. */
  private choice(
    x: number,
    y: number,
    text: string,
    onPick: () => void,
    options: { fontSize?: string; color?: string } = {},
  ): Phaser.GameObjects.Text {
    const idleColor = options.color ?? '#e8dfc4'
    let index = -1

    const item = addChoice(this, x, y, text, onPick, {
      ...options,
      color: idleColor,
      onFocus: () => this.focus.focusAt(index),
    })

    index = this.focus.add({ text: item, activate: onPick, idleColor })
    return item
  }

  /** 단계에 맞는 지우기 동작 */
  private erase(): void {
    if (this.step === 'age') {
      this.ageText = this.ageText.slice(0, -1)
    } else if (this.step === 'surname' || this.step === 'dittoName') {
      this.composer.backspace()
    } else {
      return
    }

    this.entry?.setText(this.step === 'age' ? this.ageText : this.composer.text)
  }

  private renderNameStep(): void {
    this.composer.clear()

    // 8자를 다 채워도 아래 자모 묶음 라벨과 겹치지 않는 높이입니다.
    const entry = this.add.text(GAME_WIDTH / 2, PANEL.y + 64, '', {
      fontFamily: FontFamily.Body,
      fontSize: '34px',
      color: '#ffd447',
    })
    entry.setOrigin(0.5, 0)
    this.entry = entry

    // 화면 자판으로 고친 값을 입력창에도 맞춰 둡니다. 그래야 이어서
    // 키보드로 칠 때 앞 글자가 사라지지 않습니다.
    const refresh = (): void => {
      entry.setText(this.composer.text)
      this.textInput?.setValue(this.composer.text)
    }

    this.addJamoGroup('초성', GROUPS.cho, CHOSEONG, (index) => {
      this.composer.pickChoseong(index)
      refresh()
    })
    this.addJamoGroup('중성', GROUPS.jung, JUNGSEONG, (index) => {
      this.composer.pickJungseong(index)
      refresh()
    })
    this.addJamoGroup('받침', GROUPS.jong, JONGSEONG, (index) => {
      this.composer.pickJongseong(index)
      refresh()
    })

    this.choice(PANEL.x + 44, PANEL.y + PANEL.height - 34, '완성 !', () => this.submitName())

    this.choice(PANEL.x + 154, PANEL.y + PANEL.height - 34, '지우기', () => {
      this.composer.backspace()
      refresh()
    })

    this.textInput = new HiddenTextInput({
      maxLength: MAX_NAME,
      onChange: (value) => {
        this.composer.setText(value)
        entry.setText(value)
      },
      onSubmit: () => this.submitName(),
      onActivate: () => this.focus.activate(),
      onMove: (dx, dy) => this.focus.move(dx, dy),
    })
  }

  private submitName(): void {
    this.composer.commitPending()
    const value = this.composer.text.trim()
    if (value.length === 0) return

    this.finishStep(value)
  }

  private addJamoGroup(
    label: string,
    group: { x: number; columns: number },
    jamo: readonly string[],
    onPick: (index: number) => void,
  ): void {
    const width = (group.columns - 1) * JAMO_COL

    this.add
      .text(group.x + width / 2, JAMO_TOP - 28, label, {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#a8c4bd',
      })
      .setOrigin(0.5, 0)

    jamo.forEach((char, index) => {
      const x = group.x + (index % group.columns) * JAMO_COL
      const y = JAMO_TOP + Math.floor(index / group.columns) * JAMO_ROW
      this.choice(x, y, char, () => onPick(index))
    })
  }

  private renderAgeStep(): void {
    const entry = this.add.text(GAME_WIDTH / 2, PANEL.y + 110, '', {
      fontFamily: FontFamily.Body,
      fontSize: '40px',
      color: '#ffd447',
    })
    entry.setOrigin(0.5, 0)
    this.entry = entry

    const refresh = (): void => {
      entry.setText(this.ageText)
      this.textInput?.setValue(this.ageText)
    }

    for (let digit = 0; digit <= 9; digit += 1) {
      const x = GAME_WIDTH / 2 + (digit - 4.5) * 54
      this.choice(
        x,
        PANEL.y + 214,
        `${digit}`,
        () => {
          // 나이는 두 자리까지만 받습니다.
          if (this.ageText.length >= 2) return
          if (this.ageText === '' && digit === 0) return

          this.ageText += `${digit}`
          refresh()
        },
        { fontSize: '30px' },
      )
    }

    this.choice(PANEL.x + 44, PANEL.y + PANEL.height - 34, '완성 !', () => this.submitAge())

    this.choice(PANEL.x + 154, PANEL.y + PANEL.height - 34, '지우기', () => {
      this.ageText = this.ageText.slice(0, -1)
      refresh()
    })

    this.textInput = new HiddenTextInput({
      maxLength: 2,
      numeric: true,
      onChange: (value) => {
        this.ageText = value
        entry.setText(value)
      },
      onSubmit: () => this.submitAge(),
      onActivate: () => this.focus.activate(),
      onMove: (dx, dy) => this.focus.move(dx, dy),
    })
  }

  private submitAge(): void {
    const value = Number(this.ageText)
    if (!Number.isFinite(value) || value <= 0) return

    this.finishStep(value)
  }

  private renderCalendarStep(step: Step): void {
    drawParchmentFrame(this)

    const prompt = this.add.text(GAME_WIDTH / 2, 16, PROMPTS[step], {
      fontFamily: FontFamily.Body,
      fontSize: '22px',
      color: '#4a3a1c',
    })
    prompt.setOrigin(0.5, 0)

    createCalendar(this, {
      year: this.year,
      color: COLORS[step],
      onPick: (value) => this.finishStep(value),
      register: (text, idleColor, activate) => {
        this.focus.add({ text, idleColor, activate })
      },
    })
  }

  /** 이번 단계의 답을 담고 다음으로 넘어갑니다. */
  private finishStep(value: string | number | MonthDay): void {
    switch (this.step) {
      case 'surname':
        this.answers.surname = value as string
        break
      case 'dittoName':
        this.answers.dittoName = value as string
        break
      case 'dittoBirthday':
        this.answers.dittoBirthday = value as MonthDay
        break
      case 'age':
        this.answers.age = value as number
        break
      case 'birthday':
        this.answers.birthday = value as MonthDay
        break
    }

    this.stepIndex += 1

    if (this.stepIndex >= STEPS.length) {
      this.complete()
      return
    }

    this.composer = new NameComposer(MAX_NAME)
    this.ageText = ''

    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.renderStep()
      this.cameras.main.fadeIn(200, 0, 0, 0)
    })
  }

  private complete(): void {
    this.answers.year = this.year
    const result = this.answers as SetupResult

    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(result))
    } catch {
      // 저장이 막혀도 이번 판은 그대로 이어집니다.
    }

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Dialogue, result)
    })
  }
}
