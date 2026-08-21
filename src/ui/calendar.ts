import Phaser from 'phaser'

import { FontFamily, GAME_WIDTH } from '../constants'

/**
 * 한 해 열두 달을 한 화면에 펼쳐 놓고 날짜를 고르게 합니다.
 *
 * 게임 안 연도를 하나 고정해 두고 그 해의 요일에 맞춰 칸을 배치합니다.
 * 연도가 없으면 요일 머리글이 의미를 잃기 때문입니다.
 */

export interface MonthDay {
  month: number
  day: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const COLUMNS = 3
const BLOCK_WIDTH = 310
// 화면 아래 안내 문구와 겹치지 않도록 잡은 높이입니다.
const BLOCK_HEIGHT = 112
const GRID_LEFT = 12
const GRID_TOP = 52

const DAY_COL = 34
const DAY_ROW = 13
const DAYS_LEFT = 56

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return lengths[month - 1]!
}

/** 그 날짜의 요일 (0 = 일요일) */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** 토요일과 일요일은 쉽니다. */
export function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = weekdayOf(year, month, day)
  return weekday === 0 || weekday === 6
}

/** 그 달 1일의 요일 (0 = 일요일) */
function firstWeekday(year: number, month: number): number {
  return weekdayOf(year, month, 1)
}

export interface CalendarOptions {
  /** 달력이 나타낼 해. 요일 배치와 2월 길이가 여기에 따라 달라집니다. */
  year: number
  /** 날짜를 골랐을 때 */
  onPick: (value: MonthDay) => void
  color?: number
  highlight?: string
  /**
   * 키보드 커서에 날짜 칸을 등록합니다. 주어지면 색은 커서가 도맡으므로
   * 달력은 마우스 올림에 따른 색 변경을 하지 않습니다.
   */
  register?: (text: Phaser.GameObjects.Text, idleColor: string, activate: () => void) => void
}

/**
 * 열두 달 달력을 그립니다. 날짜 하나하나가 누를 수 있는 글자입니다.
 */
export function createCalendar(scene: Phaser.Scene, options: CalendarOptions): void {
  const { year, onPick, color = 0x1f5560, highlight = '#ffd447', register } = options

  const background = scene.add.graphics()
  background.fillStyle(color, 1)
  background.fillRect(8, GRID_TOP - 12, GAME_WIDTH - 16, 4 * BLOCK_HEIGHT + 16)
  background.lineStyle(2, 0xb08d3f, 1)
  background.strokeRect(8, GRID_TOP - 12, GAME_WIDTH - 16, 4 * BLOCK_HEIGHT + 16)

  for (let month = 1; month <= 12; month += 1) {
    const col = (month - 1) % COLUMNS
    const row = Math.floor((month - 1) / COLUMNS)
    const blockX = GRID_LEFT + col * BLOCK_WIDTH
    const blockY = GRID_TOP + row * BLOCK_HEIGHT

    drawMonth(scene, blockX, blockY, year, month, onPick, highlight, register)
  }
}

function drawMonth(
  scene: Phaser.Scene,
  blockX: number,
  blockY: number,
  year: number,
  month: number,
  onPick: (value: MonthDay) => void,
  highlight: string,
  register: CalendarOptions['register'],
): void {
  // 왼쪽에 연도와 달
  scene.add
    .text(blockX + 8, blockY + 6, `${year}`, {
      fontFamily: FontFamily.Plain,
      fontSize: '11px',
      color: '#f6efdc',
    })
    .setOrigin(0, 0)

  scene.add
    .text(blockX + 12, blockY + 24, `${month}`, {
      fontFamily: FontFamily.Plain,
      fontSize: '20px',
      color: '#f6efdc',
    })
    .setOrigin(0, 0)

  WEEKDAYS.forEach((label, index) => {
    scene.add
      .text(blockX + DAYS_LEFT + index * DAY_COL, blockY + 6, label, {
        fontFamily: FontFamily.Plain,
        fontSize: '10px',
        // 일요일만 붉게 두어 주가 어디서 시작하는지 보이게 합니다.
        color: index === 0 ? '#ff9a9a' : '#cfc6a0',
      })
      .setOrigin(0.5, 0)
  })

  const total = daysInMonth(year, month)
  const offset = firstWeekday(year, month)

  for (let day = 1; day <= total; day += 1) {
    const cell = offset + day - 1
    const x = blockX + DAYS_LEFT + (cell % 7) * DAY_COL
    const y = blockY + 20 + Math.floor(cell / 7) * DAY_ROW

    const idle = cell % 7 === 0 ? '#ff9a9a' : '#efe8d2'
    const text = scene.add.text(x, y, `${day}`, {
      fontFamily: FontFamily.Plain,
      fontSize: '12px',
      color: idle,
    })
    text.setOrigin(0.5, 0)
    // 글자가 작아 누르기 어려우므로 판정 범위를 넉넉히 잡습니다.
    text.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-8, -2, text.width + 16, text.height + 4),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    })

    const pick = (): void => onPick({ month, day })

    if (register) {
      register(text, idle, pick)
    } else {
      text.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => text.setColor(highlight))
      text.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => text.setColor(idle))
    }

    text.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, pick)
  }
}
