import Phaser from 'phaser'

import { playBgm } from '../audio/bgm'
import { AudioKey, FontFamily, GAME_WIDTH, MusicFile, SAVE_KEY, SceneKey } from '../constants'
import { createCalendar, type MonthDay } from '../ui/calendar'
import { CHOSEONG, JONGSEONG, JUNGSEONG, NameComposer } from '../ui/hangul'
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
    this.renderStep()
    this.cameras.main.fadeIn(300, 0, 0, 0)
  }

  private get step(): Step {
    return STEPS[this.stepIndex]!
  }

  /** 단계가 바뀔 때마다 화면을 통째로 다시 그립니다. */
  private renderStep(): void {
    this.children.removeAll()
    this.input.removeAllListeners()

    const step = this.step

    if (step === 'dittoBirthday' || step === 'birthday') {
      this.renderCalendarStep(step)
      return
    }

    drawParchmentFrame(this)
    drawInnerPanel(this, PANEL, COLORS[step])
    addPrompt(this, PANEL, PROMPTS[step])

    if (step === 'age') {
      this.renderAgeStep()
      return
    }

    this.renderNameStep()
  }

  private renderNameStep(): void {
    this.composer.clear()

    const entry = this.add.text(GAME_WIDTH / 2, PANEL.y + 92, '', {
      fontFamily: FontFamily.Body,
      fontSize: '34px',
      color: '#ffd447',
    })
    entry.setOrigin(0.5, 0)

    const refresh = (): void => {
      entry.setText(this.composer.text)
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

    addChoice(this, PANEL.x + 44, PANEL.y + PANEL.height - 34, '완성 !', () => {
      this.composer.commitPending()
      const value = this.composer.text.trim()
      if (value.length === 0) return

      this.finishStep(value)
    })

    addChoice(this, PANEL.x + 154, PANEL.y + PANEL.height - 34, '지우기', () => {
      this.composer.backspace()
      refresh()
    })
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
      addChoice(this, x, y, char, () => onPick(index))
    })
  }

  private renderAgeStep(): void {
    const entry = this.add.text(GAME_WIDTH / 2, PANEL.y + 110, '', {
      fontFamily: FontFamily.Body,
      fontSize: '40px',
      color: '#ffd447',
    })
    entry.setOrigin(0.5, 0)

    const refresh = (): void => {
      entry.setText(this.ageText)
    }

    for (let digit = 0; digit <= 9; digit += 1) {
      const x = GAME_WIDTH / 2 + (digit - 4.5) * 54
      addChoice(this, x, PANEL.y + 214, `${digit}`, () => {
        // 나이는 두 자리까지만 받습니다.
        if (this.ageText.length >= 2) return
        if (this.ageText === '' && digit === 0) return

        this.ageText += `${digit}`
        refresh()
      }, { fontSize: '30px' })
    }

    addChoice(this, PANEL.x + 44, PANEL.y + PANEL.height - 34, '완성 !', () => {
      const value = Number(this.ageText)
      if (!Number.isFinite(value) || value <= 0) return

      this.finishStep(value)
    })

    addChoice(this, PANEL.x + 154, PANEL.y + PANEL.height - 34, '지우기', () => {
      this.ageText = this.ageText.slice(0, -1)
      refresh()
    })
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
