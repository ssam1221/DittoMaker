import Phaser from 'phaser'

import {
  dayMessage,
  findActivity,
  GRADE_LABELS,
  REST,
  runMonth,
  type Activity,
  type DayLog,
  type DaySlot,
} from '../activities'
import { playBgm } from '../audio/bgm'
import { cryPath } from '../audio/sfx'
import { AudioKey, FontFamily, GAME_HEIGHT, GAME_WIDTH, MusicFile, SceneKey } from '../constants'
import {
  farewellsForPlan,
  greetingsForPlan,
  npcArtKey,
  npcCryKey,
  npcFor,
  npcPortraitKey,
  NPCS,
  type Greeting,
} from '../npc'
import {
  ageInMonths,
  conditionLabel,
  dateOf,
  ensureRaisingState,
  PERIOD_LABELS,
  periodDayRange,
  STAT_LABELS,
  TYPE_MAX,
  TYPES,
  type RaisingState,
  type Stats,
  type TypeKey,
} from '../raising'
import type { SaveData } from '../save'
import { daysInMonth } from '../ui/calendar'
import { withJosa } from '../ui/hangul'
import { NpcTalk } from '../ui/npcTalk'
import { drawParchmentFrame, GOLD, GOLD_LIGHT } from '../ui/panel'

/**
 * 짜 놓은 한 달을 하루씩 치르는 화면입니다.
 *
 * 담당 포켓몬이 나와 인사를 건네면 1초에 하루씩 날이 흐릅니다.
 * 그날의 성과(상·중·하)에 따라 오르는 양과 문구가 달라지고,
 * 한 달이 끝나면 무엇이 얼마나 올랐는지 정리해 보여 준 뒤
 * 담당이 다시 나와 작별 인사를 합니다.
 */

const DITTO_KEY = '0132-메타몽'

/** 하루가 지나는 데 걸리는 시간 */
const DAY_MS = 1000

const DATE = { x: 20, y: 16, width: 290, height: 92 }
const TITLE = { x: 322, y: 16, width: 306, height: 92 }
const INFO = { x: 640, y: 16, width: 300, height: 92 }
const STAGE = { x: 20, y: 122, width: 560, height: 272 }
const TALK = { x: 600, y: 122, width: 340, height: 272 }
const GAUGE = { x: 20, y: 408, width: 920, height: 112 }

const PANEL_COLOR = 0x232a4d
const STAGE_COLOR = 0x2b2136

/** 능력치 막대가 가득 차는 기준값 — 육성 화면과 같게 둡니다. */
const BAR_FULL = 200

const GRADE_COLORS: Record<string, string> = {
  high: '#7fd88a',
  mid: '#ffd447',
  low: '#e08a8a',
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 칸을 시작할 때보다 나아졌는지 나빠졌는지 */
const VALUE_COLORS = {
  up: '#7fd88a',
  down: '#e06666',
  same: '#ffd447',
} as const

interface GaugeRow {
  label: string
  value: number
  full: number
  color: number
  /** 스트레스처럼 오르면 나쁜 값 — 색을 뒤집습니다. */
  negative?: boolean
}

type Phase = 'greet' | 'days' | 'summary' | 'farewell'

/**
 * 값이 나아졌으면 초록, 나빠졌으면 붉은색.
 * 스트레스처럼 오르면 나쁜 값은 두 색을 맞바꿉니다.
 */
function valueColor(row: GaugeRow, before: number, same: string = VALUE_COLORS.same): string {
  const change = row.value - before
  if (change === 0) return same

  const better = row.negative ? change < 0 : change > 0
  return better ? VALUE_COLORS.up : VALUE_COLORS.down
}

/**
 * 같은 만큼 오른 것들을 한 줄로 묶습니다.
 * 열여덟 타입을 한 줄씩 늘어놓으면 결과 판이 넘칩니다.
 */
function groupByGain(
  entries: ReadonlyArray<{ label: string; gain: number }>,
  say: (names: string, gain: number) => string,
): string[] {
  const groups = new Map<number, string[]>()

  for (const entry of entries) {
    if (entry.gain <= 0) continue
    groups.set(entry.gain, [...(groups.get(entry.gain) ?? []), entry.label])
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([gain, names]) => say(names.join('·'), gain))
}

export class ActivityScene extends Phaser.Scene {
  private save!: SaveData
  private before!: RaisingState
  private after!: RaisingState
  private plan: string[] = []

  private logs: DayLog[] = []
  private messages: string[] = []
  /** 지금 보고 있는 날 (logs 전체에서의 자리) */
  private index = 0

  /** 칸마다 며칠째부터 며칠째까지인지 */
  private slotRanges: Array<{ from: number; to: number }> = []
  /** 칸을 시작하기 직전의 상태 — 그 칸의 결과를 낼 때 견줍니다. */
  private slotStarts: RaisingState[] = []
  private slotIndex = 0

  private greetings: Array<Greeting | undefined> = []
  private farewells: Array<Greeting | undefined> = []

  private phase: Phase = 'greet'
  private talk?: NpcTalk
  private ticker?: Phaser.Time.TimerEvent
  private summaryBox?: Phaser.GameObjects.Container

  private dateLine!: Phaser.GameObjects.Text
  private dayNumber!: Phaser.GameObjects.Text
  private seasonLine!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private teacherText!: Phaser.GameObjects.Text
  private moneyText!: Phaser.GameObjects.Text
  private ageText!: Phaser.GameObjects.Text
  private headline!: Phaser.GameObjects.Text
  private message!: Phaser.GameObjects.Text
  private gradeChip!: Phaser.GameObjects.Text
  private earnedText!: Phaser.GameObjects.Text
  private conditionText!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text

  private gauges!: Phaser.GameObjects.Graphics
  private gaugeLabels: Phaser.GameObjects.Text[] = []
  private gaugeValues: Phaser.GameObjects.Text[] = []

  private teacherArt?: Phaser.GameObjects.Image
  private dittoArt!: Phaser.GameObjects.Image
  private holidayText!: Phaser.GameObjects.Text
  private holidayNote!: Phaser.GameObjects.Text
  private shownNpc?: string
  private drawnSlot = -1

  constructor() {
    super(SceneKey.Activity)
  }

  init(data: SaveData): void {
    this.save = data
    this.before = ensureRaisingState(data.raising)
    this.plan = [...this.before.plan]

    // 씬은 다시 쓰이므로 지난번 흔적을 지우고 시작합니다.
    this.logs = []
    this.messages = []
    this.index = 0
    this.slotRanges = []
    this.slotStarts = []
    this.slotIndex = 0
    this.greetings = []
    this.farewells = []
    this.phase = 'greet'
    this.talk = undefined
    this.ticker = undefined
    this.summaryBox = undefined
    this.gaugeLabels = []
    this.gaugeValues = []
    this.teacherArt = undefined
    this.shownNpc = undefined
    this.drawnSlot = -1
  }

  preload(): void {
    this.load.image(DITTO_KEY, `assets/pokemon/artwork/${DITTO_KEY}.png`)
    this.load.audio(AudioKey.Road, `music/${encodeURIComponent(MusicFile.Road)}`)

    for (const npc of Object.values(NPCS)) {
      this.load.image(npcArtKey(npc.key), `assets/pokemon/npc/${npc.key}.png`)
      this.load.image(npcPortraitKey(npc.key), `assets/pokemon/portrait/npc/${npc.key}.png`)
      this.load.audio(npcCryKey(npc.key), cryPath(npc.cry))
    }
  }

  create(): void {
    const run = runMonth(this.before, this.buildSlots())
    this.logs = run.logs
    this.after = run.state
    this.messages = this.logs.map((log) =>
      log.grade ? dayMessage(log.activity.kind, log.grade) : '',
    )
    this.greetings = greetingsForPlan(this.plan)
    this.farewells = farewellsForPlan(this.plan)
    this.splitSlots()

    playBgm(this, AudioKey.Road)

    drawParchmentFrame(this)
    this.createDatePanel()
    this.createTitlePanel()
    this.createInfoPanel()
    this.createStage()
    this.createTalkPanel()
    this.createGaugePanel()

    this.bindInput()
    this.cameras.main.fadeIn(400, 0, 0, 0)

    // 첫 화면은 첫날의 모습으로 채워 두고 인사부터 받습니다.
    if (this.logs[0]) this.showDay(this.logs[0])

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ticker?.remove())

    this.runSlot()
  }

  /**
   * 하루하루의 기록을 칸별로 나눠 둡니다.
   *
   * 한 칸은 인사부터 결과까지 한 묶음으로 돌아가므로,
   * 어디서부터 어디까지가 한 칸인지와 그 직전 상태가 필요합니다.
   */
  private splitSlots(): void {
    this.logs.forEach((log, index) => {
      const range = this.slotRanges[log.slot]

      if (!range) {
        this.slotRanges[log.slot] = { from: index, to: index }
        // 첫 칸의 앞은 시작 상태, 그다음부터는 앞 칸의 마지막 날입니다.
        this.slotStarts[log.slot] = index === 0 ? this.before : this.logs[index - 1]!.state
        return
      }

      range.to = index
    })
  }

  /** 일정 한 칸이 달력의 며칠부터 며칠까지인지 */
  private buildSlots(): DaySlot[] {
    return this.plan.map((key, index) => {
      const activity = findActivity(key) ?? REST
      const date = dateOf(this.save.year, this.before.period + index)
      const [from, to] = periodDayRange(date.period, daysInMonth(date.year, date.month))

      return {
        activity,
        year: date.year,
        month: date.month,
        firstDay: from,
        days: to - from + 1,
      }
    })
  }

  // --- 화면 만들기 ---

  private panel(
    rect: { x: number; y: number; width: number; height: number },
    color: number,
  ): void {
    const g = this.add.graphics()
    g.fillStyle(color, 1)
    g.fillRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(3, GOLD, 1)
    g.strokeRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(1, GOLD_LIGHT, 0.8)
    g.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10)
  }

  private createDatePanel(): void {
    this.panel(DATE, PANEL_COLOR)

    this.dateLine = this.add.text(DATE.x + 20, DATE.y + 16, '', {
      fontFamily: FontFamily.Body,
      fontSize: '18px',
      color: '#f6efdc',
    })

    this.dayNumber = this.add
      .text(DATE.x + 20, DATE.y + 46, '', {
        fontFamily: FontFamily.Body,
        fontSize: '34px',
        color: '#ffd447',
      })
      .setOrigin(0, 0)

    this.seasonLine = this.add
      .text(DATE.x + DATE.width - 20, DATE.y + DATE.height - 22, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#b7aecd',
      })
      .setOrigin(1, 0.5)
  }

  private createTitlePanel(): void {
    this.panel(TITLE, PANEL_COLOR)

    this.titleText = this.add
      .text(TITLE.x + TITLE.width / 2, TITLE.y + 22, '', {
        fontFamily: FontFamily.Body,
        fontSize: '26px',
        color: '#f6efdc',
      })
      .setOrigin(0.5, 0)

    this.teacherText = this.add
      .text(TITLE.x + TITLE.width / 2, TITLE.y + 58, '', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#b7aecd',
      })
      .setOrigin(0.5, 0)
  }

  private createInfoPanel(): void {
    this.panel(INFO, PANEL_COLOR)

    this.add
      .text(INFO.x + 20, INFO.y + 18, this.save.dittoName, {
        fontFamily: FontFamily.Body,
        fontSize: '24px',
        color: '#f6efdc',
      })
      .setOrigin(0, 0)

    this.ageText = this.add
      .text(INFO.x + 20, INFO.y + 54, '', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#b7aecd',
      })
      .setOrigin(0, 0)

    this.moneyText = this.add
      .text(INFO.x + INFO.width - 20, INFO.y + INFO.height / 2, '', {
        fontFamily: FontFamily.Body,
        fontSize: '22px',
        color: '#ffd447',
      })
      .setOrigin(1, 0.5)
  }

  /** 메타몽과 담당 포켓몬이 서 있는 자리 */
  private createStage(): void {
    this.panel(STAGE, STAGE_COLOR)

    const floorY = STAGE.y + STAGE.height - 58

    const g = this.add.graphics()
    g.fillStyle(0x3a2c46, 1)
    g.fillRect(STAGE.x + 8, floorY, STAGE.width - 16, STAGE.height - (floorY - STAGE.y) - 8)

    const ditto = this.add.image(STAGE.x + 150, floorY + 18, DITTO_KEY)
    ditto.setOrigin(0.5, 1)
    ditto.setScale(150 / ditto.height)
    this.dittoArt = ditto

    // 주말에는 아무도 나오지 않고 이 글씨만 남습니다.
    this.holidayText = this.add
      .text(STAGE.x + STAGE.width / 2, STAGE.y + STAGE.height / 2 - 10, '휴일', {
        fontFamily: FontFamily.Body,
        fontSize: '64px',
        color: '#ffd447',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.holidayNote = this.add
      .text(STAGE.x + STAGE.width / 2, STAGE.y + STAGE.height / 2 + 44, '', {
        fontFamily: FontFamily.Body,
        fontSize: '20px',
        color: '#b7aecd',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.tweens.add({
      targets: ditto,
      scaleX: ditto.scaleX * 1.05,
      scaleY: ditto.scaleY * 0.95,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private createTalkPanel(): void {
    this.panel(TALK, PANEL_COLOR)

    this.headline = this.add.text(TALK.x + 24, TALK.y + 28, '', {
      fontFamily: FontFamily.Body,
      fontSize: '22px',
      color: '#ffd447',
      wordWrap: { width: TALK.width - 48 },
    })

    this.message = this.add.text(TALK.x + 24, TALK.y + 78, '', {
      fontFamily: FontFamily.Body,
      fontSize: '19px',
      color: '#f3efff',
      wordWrap: { width: TALK.width - 48 },
      lineSpacing: 9,
    })

    this.gradeChip = this.add
      .text(TALK.x + TALK.width - 24, TALK.y + TALK.height - 26, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#ffd447',
      })
      .setOrigin(1, 1)

    this.earnedText = this.add
      .text(TALK.x + 24, TALK.y + TALK.height - 26, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#f6efdc',
      })
      .setOrigin(0, 1)
  }

  private createGaugePanel(): void {
    this.panel(GAUGE, PANEL_COLOR)

    this.gauges = this.add.graphics()

    this.conditionText = this.add
      .text(GAUGE.x + GAUGE.width - 26, GAUGE.y + 34, '', {
        fontFamily: FontFamily.Body,
        fontSize: '17px',
        color: '#b7aecd',
      })
      .setOrigin(1, 0.5)

    this.hint = this.add
      .text(GAUGE.x + GAUGE.width - 26, GAUGE.y + 78, '', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#8f86a8',
      })
      .setOrigin(1, 0.5)
  }

  // --- 진행 ---

  /** 한 칸을 시작합니다. 담당이 있으면 먼저 인사를 건넵니다. */
  private runSlot(): void {
    const range = this.slotRanges[this.slotIndex]

    // 칸이 다 끝났으면 육성 화면으로 돌아갑니다.
    if (!range) {
      this.leave()
      return
    }

    // 첫날의 모습을 미리 채워 두어야 인사 뒤로 비치는 화면이 맞습니다.
    const first = this.logs[range.from]
    if (first) {
      this.index = range.from
      this.showDay(first)
    }

    const greeting = this.greetings[this.slotIndex]
    if (!greeting) {
      this.startDays()
      return
    }

    this.phase = 'greet'
    this.teacherArt?.setVisible(false)
    this.talk = new NpcTalk(this, [greeting], () => {
      this.talk = undefined
      this.teacherArt?.setVisible(true)
      this.startDays()
    })
  }

  private startDays(): void {
    const range = this.slotRanges[this.slotIndex]
    const first = range ? this.logs[range.from] : undefined

    if (!range || !first) {
      this.showSummary()
      return
    }

    this.phase = 'days'
    this.index = range.from
    this.hint.setText('Enter · 클릭 : 건너뛰기')

    this.showDay(first)

    this.ticker = this.time.addEvent({
      delay: DAY_MS,
      loop: true,
      callback: () => this.nextDay(),
    })
  }

  private nextDay(): void {
    const range = this.slotRanges[this.slotIndex]
    if (!range) return

    this.index += 1

    const log = this.index <= range.to ? this.logs[this.index] : undefined
    if (!log) {
      this.finishDays()
      return
    }

    this.showDay(log)
  }

  /** 이 칸에 남은 날을 한꺼번에 흘려보냅니다. */
  private skipDays(): void {
    const range = this.slotRanges[this.slotIndex]
    const last = range ? this.logs[range.to] : undefined

    if (range && last) {
      this.index = range.to
      this.showDay(last)
    }

    this.finishDays()
  }

  private finishDays(): void {
    this.ticker?.remove()
    this.ticker = undefined
    this.hint.setText('')
    this.showSummary()
  }

  private showDay(log: DayLog): void {
    const date = dateOf(this.save.year, log.state.period)

    this.dateLine.setText(`${date.year}년 ${log.month}월`)
    this.dayNumber.setText(`${log.day}일`)
    this.seasonLine.setText(PERIOD_LABELS[date.period - 1] ?? '')

    this.titleText.setText(log.activity.name)

    const teacher = npcFor(log.activity.key)
    this.teacherText.setText(teacher ? `${teacher.name} · ${teacher.role}` : log.activity.description)
    this.showTeacher(log.activity)

    this.showHoliday(log)

    this.headline.setText(
      log.holiday ? `${log.activity.name} · 휴일` : `${log.activity.name} ${log.dayInSlot}일째`,
    )
    this.message.setText(
      log.holiday ? '오늘은 쉬는 날. 아무 일도 하지 않았다.' : (this.messages[this.index] ?? ''),
    )

    if (log.grade) {
      this.gradeChip.setText(`성과 ${GRADE_LABELS[log.grade]}`)
      this.gradeChip.setColor(GRADE_COLORS[log.grade] ?? '#ffd447')
    } else {
      this.gradeChip.setText('')
    }

    // 그날 들어온 돈은 초록, 나간 돈은 붉게.
    this.earnedText.setText(
      log.money > 0 ? `수입 ₽ ${log.money}` : log.money < 0 ? `수업료 ₽ ${-log.money}` : '',
    )
    this.earnedText.setColor(log.money > 0 ? VALUE_COLORS.up : VALUE_COLORS.down)

    this.moneyText.setText(`₽ ${log.state.money.toLocaleString()}`)
    const months = ageInMonths(log.state.period)
    this.ageText.setText(months === 0 ? '태어난 지 얼마 되지 않았다' : `생후 ${months}개월`)
    this.conditionText.setText(`컨디션 ${conditionLabel(log.state.condition)}`)
    this.conditionText.setColor(
      valueColor(
        { label: '컨디션', value: log.state.condition, full: 100, color: 0 },
        (this.slotStarts[this.slotIndex] ?? this.before).condition,
        '#b7aecd',
      ),
    )

    // 칸이 바뀌면 지켜볼 능력치도 바뀝니다.
    if (log.slot !== this.drawnSlot) {
      this.drawnSlot = log.slot
      this.rebuildGaugeLabels(log.activity)
    }

    this.drawGauges(log)
  }

  /** 주말에는 무대를 비우고 "휴일"만 크게 띄웁니다. */
  private showHoliday(log: DayLog): void {
    this.dittoArt.setVisible(!log.holiday)
    this.teacherArt?.setVisible(!log.holiday)

    this.holidayText.setVisible(log.holiday)
    this.holidayNote.setVisible(log.holiday)
    if (log.holiday) this.holidayNote.setText(`${WEEKDAY_LABELS[log.weekday] ?? ''}요일`)
  }

  /** 담당 포켓몬을 무대 오른쪽에 세웁니다. 담당이 없으면 아무도 없습니다. */
  private showTeacher(activity: Activity): void {
    const teacher = npcFor(activity.key)

    if (teacher?.key === this.shownNpc) return
    this.shownNpc = teacher?.key

    this.teacherArt?.destroy()
    this.teacherArt = undefined

    if (!teacher) return

    const art = this.add.image(STAGE.x + 400, STAGE.y + STAGE.height - 40, npcArtKey(teacher.key))
    art.setOrigin(0.5, 1)
    art.setScale(Math.min((STAGE.height - 70) / art.height, 1))
    art.setAlpha(0)
    this.teacherArt = art

    this.tweens.add({ targets: art, alpha: 1, duration: 300 })
  }

  /** 이 활동으로 오르는 것들만 줄을 세웁니다. */
  private gaugeRows(activity: Activity, state: RaisingState): GaugeRow[] {
    const rows: GaugeRow[] = []

    if (activity.kind !== 'rest') {
      const label = STAT_LABELS.find((stat) => stat.key === activity.stat)?.label ?? '능력치'
      rows.push({
        label,
        value: state.stats[activity.stat as keyof Stats],
        full: BAR_FULL,
        color: 0xffd447,
      })

      for (const key of activity.types) {
        const type = TYPES.find((item) => item.key === key)
        if (!type) continue

        rows.push({
          label: `${type.label} 적성`,
          value: state.types[key as TypeKey],
          full: TYPE_MAX,
          color: type.color,
        })
      }
    }

      rows.push({
      label: '스트레스',
      value: state.stress,
      full: 100,
      color: 0xe06666,
      negative: true,
    })

    return rows
  }

  private rebuildGaugeLabels(activity: Activity): void {
    for (const text of [...this.gaugeLabels, ...this.gaugeValues]) text.destroy()
    this.gaugeLabels = []
    this.gaugeValues = []

    const rows = this.gaugeRows(activity, this.before)

    rows.forEach((row, index) => {
      const { x, y } = this.gaugeSpot(index)

      this.gaugeLabels.push(
        this.add
          .text(x, y, row.label, {
            fontFamily: FontFamily.Body,
            fontSize: '17px',
            color: '#f6efdc',
          })
          .setOrigin(0, 0.5),
      )

      this.gaugeValues.push(
        this.add
          .text(x + 296, y, '', {
            fontFamily: FontFamily.Body,
            fontSize: '17px',
            color: '#ffd447',
          })
          .setOrigin(1, 0.5),
      )
    })
  }

  /** 줄이 셋을 넘으면 오른쪽 칸으로 접습니다. 오른쪽 끝은 컨디션 자리입니다. */
  private gaugeSpot(index: number): { x: number; y: number } {
    const column = index >= 3 ? 1 : 0
    const row = index % 3

    return {
      x: GAUGE.x + 24 + column * 360,
      y: GAUGE.y + 26 + row * 30,
    }
  }

  private drawGauges(log: DayLog): void {
    this.gauges.clear()

    const rows = this.gaugeRows(log.activity, log.state)
    // 칸을 시작할 때와 견줘, 나아진 값은 초록으로 나빠진 값은 붉게 씁니다.
    const start = this.slotStarts[this.slotIndex] ?? this.before
    const before = this.gaugeRows(log.activity, start)

    rows.forEach((row, index) => {
      const { x, y } = this.gaugeSpot(index)
      const left = x + 104
      const width = 168

      this.gauges.fillStyle(0x0d0b1a, 0.85)
      this.gauges.fillRect(left, y - 7, width, 14)

      const filled = Math.max(0, Math.min(1, row.value / row.full))
      this.gauges.fillStyle(row.color, 1)
      this.gauges.fillRect(left, y - 7, width * filled, 14)

      this.gauges.lineStyle(1, GOLD_LIGHT, 0.7)
      this.gauges.strokeRect(left, y - 7, width, 14)

      const value = this.gaugeValues[index]
      value?.setText(`${row.value}`)
      value?.setColor(valueColor(row, before[index]?.value ?? row.value))
    })
  }

  // --- 마무리 ---

  private showSummary(): void {
    this.phase = 'summary'

    const box = this.add.container(0, 0)
    box.setDepth(110)
    this.summaryBox = box

    const shade = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.55,
    )

    const range = this.slotRanges[this.slotIndex]
    const days = range ? range.to - range.from + 1 : 0
    const lines = this.summaryLines()
    // 줄 수에 맞춰 판을 키웁니다. 그래도 넘치면 글자를 한 단계 줄입니다.
    const dense = lines.length > 9
    const lineHeight = dense ? 26 : 31
    const height = Math.min(452, 150 + lines.length * lineHeight)
    const rect = { x: 210, y: (GAME_HEIGHT - height) / 2, width: 540, height }
    const panel = this.add.graphics()
    panel.fillStyle(0x1a1730, 0.97)
    panel.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 14)
    panel.lineStyle(3, GOLD, 1)
    panel.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 14)
    panel.lineStyle(1, GOLD_LIGHT, 0.8)
    panel.strokeRoundedRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12, 10)

    const title = this.add
      .text(rect.x + rect.width / 2, rect.y + 30, `${days}일 간 결과`, {
        fontFamily: FontFamily.Body,
        fontSize: '26px',
        color: '#ffd447',
      })
      .setOrigin(0.5, 0)

    const body = this.add.text(rect.x + 46, rect.y + 78, lines.join('\n'), {
      fontFamily: FontFamily.Body,
      fontSize: dense ? '17px' : '19px',
      color: '#f3efff',
      lineSpacing: dense ? 8 : 11,
      wordWrap: { width: rect.width - 92 },
    })

    const prompt = this.add
      .text(rect.x + rect.width / 2, rect.y + rect.height - 28, 'Enter · 클릭 으로 계속', {
        fontFamily: FontFamily.Body,
        fontSize: '16px',
        color: '#8f86a8',
      })
      .setOrigin(0.5, 1)

    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    box.add([shade, panel, title, body, prompt])
  }

  /** 이번 칸 사이에 달라진 것만 골라 한 줄씩 */
  private summaryLines(): string[] {
    const range = this.slotRanges[this.slotIndex]
    const before = this.slotStarts[this.slotIndex]
    const after = range ? this.logs[range.to]?.state : undefined

    if (!range || !before || !after) return ['이렇다 할 변화는 없었다.']

    const lines: string[] = []

    const stats = STAT_LABELS.map((stat) => ({
      label: stat.label,
      gain: after.stats[stat.key] - before.stats[stat.key],
    }))
    lines.push(...groupByGain(stats, (names, gain) => `${withJosa(names, '이', '가')} ${gain} 올랐다!`))

    const bond = after.stats.bond - before.stats.bond
    if (bond > 0) lines.push(`정이 ${bond} 붙었다!`)

    const types = TYPES.map((type) => ({
      label: type.label,
      gain: after.types[type.key] - before.types[type.key],
    }))
    lines.push(...groupByGain(types, (names, gain) => `${names} 적성이 ${gain} 올랐다!`))

    // 번 돈과 쓴 돈을 상계하면 "₽ 1 벌었다" 같은 말이 나옵니다. 따로 셉니다.
    const slotLogs = this.logs.slice(range.from, range.to + 1)
    const earned = slotLogs.reduce((sum, log) => sum + Math.max(0, log.money), 0)
    const spent = slotLogs.reduce((sum, log) => sum + Math.max(0, -log.money), 0)
    if (earned > 0) lines.push(`일해서 ₽ ${earned.toLocaleString()} 벌었다!`)
    if (spent > 0) lines.push(`수업료로 ₽ ${spent.toLocaleString()} 나갔다.`)

    const stress = after.stress - before.stress
    if (stress > 0) lines.push(`스트레스가 ${stress} 쌓였다.`)
    if (stress < 0) lines.push(`스트레스가 ${-stress} 풀렸다.`)

    if (lines.length === 0) lines.push('이렇다 할 변화는 없었다.')

    lines.push(`지금 컨디션은 ${conditionLabel(after.condition)}.`)

    return lines
  }

  /** 이 칸을 맡았던 담당이 다시 나와 작별 인사를 합니다. */
  private farewell(): void {
    this.summaryBox?.destroy(true)
    this.summaryBox = undefined

    const farewell = this.farewells[this.slotIndex]

    if (!farewell) {
      this.nextSlot()
      return
    }

    this.phase = 'farewell'
    this.teacherArt?.setVisible(false)
    this.talk = new NpcTalk(this, [farewell], () => {
      this.talk = undefined
      this.nextSlot()
    })
  }

  private nextSlot(): void {
    this.slotIndex += 1
    this.teacherArt?.setVisible(true)
    this.runSlot()
  }

  /** 달라진 상태를 들고 육성 화면으로 돌아갑니다. */
  private leave(): void {
    this.ticker?.remove()
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKey.Raising, { ...this.save, raising: this.after })
    })
  }

  // --- 조작 ---

  private bindInput(): void {
    const keyboard = this.input.keyboard!

    const advance = (): void => this.advance()

    keyboard.on('keydown-ENTER', advance)
    keyboard.on('keydown-SPACE', advance)
    keyboard.on('keydown-ESC', () => {
      // 대화는 건너뛰고, 날짜는 한꺼번에 흘려보냅니다.
      if (this.talk) {
        this.talk.cancel()
        return
      }

      this.advance()
    })

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // 대화창이 떠 있으면 그쪽이 클릭을 가져갑니다.
      if (this.talk) return
      this.advance()
    })
  }

  private advance(): void {
    if (this.talk) {
      this.talk.submit()
      return
    }

    if (this.phase === 'days') {
      this.skipDays()
      return
    }

    if (this.phase === 'summary') {
      this.farewell()
    }
  }
}
