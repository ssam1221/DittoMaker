import Phaser from 'phaser'

import { canAfford, findActivity, type Activity } from '../activities'
import { FontFamily, GAME_HEIGHT, GAME_WIDTH } from '../constants'
import {
  PERIOD_LABELS,
  PERIODS_PER_MONTH,
  periodDayRange,
  TYPES,
  type RaisingState,
} from '../raising'
import { daysInMonth } from './calendar'
import { addChoice } from './panel'

/**
 * 일정을 짜는 창.
 *
 * 화면을 갈아엎지 않고 방 위에 두 장을 띄웁니다. 왼쪽은 이번 달 달력,
 * 오른쪽은 고를 것들입니다. 무엇을 정하든 방이 계속 보이는 편이
 * 지금 어디쯤인지 놓치지 않습니다.
 */

const LEFT = { x: 24, y: 84, width: 300, height: 252 }
/** 달력 아래 — 짜 둔 세 칸과 고른 항목 설명이 앉는 자리 */
const PLAN = { x: 24, y: 344, width: 300, height: 122 }
const RIGHT = { x: 344, y: 84, width: 324, height: 372 }

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
const COLOR_BLOCKED = '#8a7a6a'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const TYPE_INFO = new Map(TYPES.map((t) => [t.key, t]))

export interface ScheduleItem {
  label: string
  /** 오른쪽에 덧붙는 값 (수업료, 급여 등) */
  note?: string
  /** 아래에 뜨는 설명 */
  detail?: string
  /** 색 조각으로 보일 타입들 */
  activity?: Activity
  /** 고를 수 없는 상태인지 */
  blocked?: boolean
  run: () => void
}

export interface SchedulePopupOptions {
  title: string
  items: ScheduleItem[]
  state: RaisingState
  date: { year: number; month: number; period: number }
  /** 이번 달에 짜 둔 세 칸. 채워진 자리는 이름이, 빈 자리는 줄표가 뜹니다. */
  plan: string[]
  /** Esc 로 닫았을 때 */
  onCancel: () => void
}

export class SchedulePopup {
  private container!: Phaser.GameObjects.Container
  private labels: Phaser.GameObjects.Text[] = []
  private detail!: Phaser.GameObjects.Text
  private index = 0
  private options!: SchedulePopupOptions

  constructor(
    private readonly scene: Phaser.Scene,
    options: SchedulePopupOptions,
  ) {
    this.build(options)
  }

  /** 같은 창에서 목록만 갈아끼웁니다. (분류 -> 세부 항목) */
  setItems(options: SchedulePopupOptions): void {
    this.container.destroy(true)
    this.labels = []
    this.index = 0
    this.build(options)
  }

  private build(options: SchedulePopupOptions): void {
    this.options = options

    const scene = this.scene
    this.container = scene.add.container(0, 0)
    this.container.setDepth(100)

    // 뒤쪽이 비쳐 보이도록 옅게만 덮습니다. 방이 계속 보여야 합니다.
    const shade = scene.add.graphics()
    shade.fillStyle(0x000000, 0.45)
    shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    this.container.add(shade)

    this.buildCalendar()
    this.buildList()
    this.refresh()
  }

  // --- 왼쪽: 이번 달 달력 ---

  private buildCalendar(): void {
    const scene = this.scene
    const { year, month, period } = this.options.date

    this.container.add(this.panel(LEFT))

    this.container.add(
      scene.add
        .text(LEFT.x + LEFT.width / 2, LEFT.y + 12, `${year}년  ${month}월`, {
          fontFamily: FontFamily.Body,
          fontSize: '19px',
          color: '#f6efdc',
        })
        .setOrigin(0.5, 0),
    )

    const cellW = (LEFT.width - 36) / 7
    const headerY = LEFT.y + 46
    const gridTop = LEFT.y + 66
    // 날짜 아래에 무엇을 하기로 했는지 한 글자를 더 넣어야 해서 조금 높습니다.
    const rowH = 31

    WEEKDAYS.forEach((label, i) => {
      this.container.add(
        scene.add
          .text(LEFT.x + 18 + cellW * (i + 0.5), headerY, label, {
            fontFamily: FontFamily.Plain,
            fontSize: '13px',
            color: i === 0 ? '#ff9a9a' : '#cfc6a0',
          })
          .setOrigin(0.5, 0),
      )
    })

    const total = daysInMonth(year, month)
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const [from, to] = periodDayRange(period, total)

    // 지금 도막에 드는 날짜만 덮어 표시합니다.
    // 날짜 글자가 칸 가운데(+0.5)에 놓이므로 네모도 같은 중심에 맞춥니다.
    const marker = scene.add.graphics()
    marker.fillStyle(0xffd447, 0.2)
    for (let day = from; day <= to; day += 1) {
      const cell = offset + day - 1
      marker.fillRect(
        LEFT.x + 18 + cellW * (cell % 7) + 2,
        gridTop + Math.floor(cell / 7) * rowH - 3,
        cellW - 4,
        rowH - 4,
      )
    }
    this.container.add(marker)

    for (let day = 1; day <= total; day += 1) {
      const cell = offset + day - 1
      const x = LEFT.x + 18 + cellW * ((cell % 7) + 0.5)
      const y = gridTop + Math.floor(cell / 7) * rowH

      this.container.add(
        scene.add
          .text(x, y, `${day}`, {
            fontFamily: FontFamily.Plain,
            fontSize: '13px',
            color: cell % 7 === 0 ? '#ff9a9a' : '#efe8d2',
          })
          .setOrigin(0.5, 0),
      )

      // 그 날이 속한 도막에 정해 둔 것이 있으면 날짜 아래에 표시합니다.
      // 원래는 그림이 들어갈 자리라, 지금은 이름 첫 글자로 대신합니다.
      const mark = this.markFor(day, total)
      if (mark) {
        this.container.add(
          scene.add
            .text(x, y + 14, mark, {
              fontFamily: FontFamily.Plain,
              fontSize: '11px',
              color: '#ffd447',
            })
            .setOrigin(0.5, 0),
        )
      }
    }

    this.buildPlan()
  }

  /** 그 날짜가 속한 칸에 짜 둔 활동의 첫 글자 */
  private markFor(day: number, daysInThisMonth: number): string | null {
    for (let slot = 0; slot < PERIODS_PER_MONTH; slot += 1) {
      const [from, to] = periodDayRange(slot + 1, daysInThisMonth)
      if (day < from || day > to) continue

      const key = this.options.plan[slot]
      if (key === undefined) return null

      return (findActivity(key)?.name ?? key).slice(0, 1)
    }

    return null
  }

  /** 달력 아래에 이번 달 세 칸을 늘어놓습니다. */
  private buildPlan(): void {
    const scene = this.scene
    const { plan } = this.options

    this.container.add(this.panel(PLAN))

    for (let i = 0; i < PERIODS_PER_MONTH; i += 1) {
      const key = plan[i]
      const filled = key !== undefined
      const name = filled ? (findActivity(key)?.name ?? key) : '—'

      this.container.add(
        scene.add
          .text(PLAN.x + 20, PLAN.y + 14 + i * 22, `${PERIOD_LABELS[i]}   ${name}`, {
            fontFamily: FontFamily.Body,
            fontSize: '16px',
            color: filled ? '#ffd447' : '#8a7a6a',
          })
          .setOrigin(0, 0),
      )
    }
  }

  // --- 오른쪽: 고를 것들 ---

  private buildList(): void {
    const scene = this.scene
    const { title, items, state } = this.options

    this.container.add(this.panel(RIGHT))

    this.container.add(
      scene.add
        .text(RIGHT.x + 20, RIGHT.y + 14, title, {
          fontFamily: FontFamily.Body,
          fontSize: '19px',
          color: '#f6efdc',
        })
        .setOrigin(0, 0),
    )

    this.container.add(
      scene.add
        .text(RIGHT.x + RIGHT.width - 20, RIGHT.y + 16, `₽ ${state.money.toLocaleString()}`, {
          fontFamily: FontFamily.Body,
          fontSize: '17px',
          color: '#ffd447',
        })
        .setOrigin(1, 0),
    )

    const divider = scene.add.graphics()
    divider.lineStyle(1, 0xb08d3f, 0.6)
    divider.lineBetween(RIGHT.x + 16, RIGHT.y + 44, RIGHT.x + RIGHT.width - 16, RIGHT.y + 44)
    this.container.add(divider)

    const rowGap = Math.min(30, (RIGHT.height - 90) / Math.max(items.length, 1))
    const top = RIGHT.y + 62

    items.forEach((item, i) => {
      const y = top + i * rowGap

      const label = addChoice(
        scene,
        RIGHT.x + 20,
        y,
        item.label,
        () => {
          this.index = i
          this.refresh()
          this.pick(i)
        },
        {
          fontSize: '18px',
          color: COLOR_IDLE,
          origin: [0, 0.5],
          onFocus: () => {
            this.index = i
            this.refresh()
          },
        },
      )
      this.labels.push(label)
      this.container.add(label)

      if (item.note) {
        this.container.add(
          scene.add
            .text(RIGHT.x + RIGHT.width - 20, y, item.note, {
              fontFamily: FontFamily.Body,
              fontSize: '16px',
              color: '#b7aecd',
            })
            .setOrigin(1, 0.5),
        )
      }

      // 오르는 타입을 색 조각으로 붙입니다.
      if (item.activity) {
        const badge = scene.add.graphics()
        item.activity.types.forEach((type, n) => {
          const info = TYPE_INFO.get(type)
          if (!info) return

          // 타입이 셋인 항목도 오른쪽 금액과 겹치지 않을 만큼 왼쪽에서 시작합니다.
          const bx = RIGHT.x + RIGHT.width - 136 + n * 20
          badge.fillStyle(info.color, 1)
          badge.fillRect(bx, y - 6, 16, 12)
          badge.lineStyle(1, 0x000000, 0.35)
          badge.strokeRect(bx, y - 6, 16, 12)
        })
        this.container.add(badge)
      }
    })

    // 고른 항목 설명은 일정 세 칸 아래, 같은 판 안에 둡니다.
    this.detail = scene.add
      .text(PLAN.x + PLAN.width / 2, PLAN.y + 84, '', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#f0e6c8',
        align: 'center',
        wordWrap: { width: PLAN.width - 28 },
      })
      .setOrigin(0.5, 0)
    this.container.add(this.detail)
  }

  private panel(rect: { x: number; y: number; width: number; height: number }): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    g.fillStyle(0x241f3d, 0.97)
    g.fillRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(3, 0xb08d3f, 1)
    g.strokeRect(rect.x, rect.y, rect.width, rect.height)
    g.lineStyle(1, 0xd8bd76, 0.85)
    g.strokeRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10)
    return g
  }

  // --- 조작 ---

  move(delta: number): void {
    const count = this.labels.length
    if (count === 0) return

    this.index = (this.index + delta + count) % count
    this.refresh()
  }

  submit(): void {
    this.pick(this.index)
  }

  cancel(): void {
    this.close()
    this.options.onCancel()
  }

  close(): void {
    this.container.destroy(true)
  }

  private pick(index: number): void {
    const item = this.options.items[index]
    if (!item || item.blocked) return

    // 실행이 창을 갈아끼우거나 닫을 수 있으므로 호출만 넘깁니다.
    item.run()
  }

  private refresh(): void {
    this.labels.forEach((label, i) => {
      const item = this.options.items[i]!
      label.setColor(
        i === this.index ? COLOR_SELECTED : item.blocked ? COLOR_BLOCKED : COLOR_IDLE,
      )
    })

    this.detail.setText(this.options.items[this.index]?.detail ?? '')
  }
}

/** 수업·일 항목을 창에 넣을 형태로 바꿉니다. */
export function toScheduleItem(
  activity: Activity,
  state: RaisingState,
  run: () => void,
): ScheduleItem {
  const types = activity.types.map((t) => TYPE_INFO.get(t)?.label ?? t).join(' · ')
  const money = activity.money >= 0 ? `+₽${activity.money}` : `₽${-activity.money}`

  return {
    label: activity.name,
    note: money,
    detail: `${activity.description}\n[ ${types} ]   스트레스 +${activity.stress}`,
    activity,
    blocked: !canAfford(state, activity),
    run,
  }
}
