import Phaser from 'phaser'

/**
 * 화면에 흩어진 글자들 사이를 방향키로 옮겨 다니는 커서입니다.
 *
 * 자모 묶음, 숫자 한 줄, 열두 달 달력은 배치가 제각각이라 항목마다
 * 위/아래/좌/우 이웃을 손으로 이어 두기 어렵습니다. 대신 누른 방향에
 * 놓인 것들 중 가장 가까운 항목으로 옮깁니다. 축을 따라간 거리를 먼저
 * 보고, 옆으로 벗어난 정도에 가중치를 줘서 같은 줄을 우선합니다.
 */

/** 옆으로 벗어난 거리에 주는 가중치. 클수록 같은 줄을 고집합니다. */
const ACROSS_WEIGHT = 2.4

export interface FocusEntry {
  text: Phaser.GameObjects.Text
  activate: () => void
  /** 커서가 벗어났을 때 되돌릴 색 */
  idleColor: string
}

export class FocusGrid {
  private entries: FocusEntry[] = []
  private index = 0

  constructor(private readonly focusColor = '#ffd447') {}

  get size(): number {
    return this.entries.length
  }

  /** 항목을 등록하고 그 번호를 돌려줍니다. */
  add(entry: FocusEntry): number {
    this.entries.push(entry)
    return this.entries.length - 1
  }

  clear(): void {
    this.entries = []
    this.index = 0
  }

  focusAt(index: number): void {
    if (index < 0 || index >= this.entries.length) return
    this.index = index
    this.refresh()
  }

  refresh(): void {
    this.entries.forEach((entry, i) => {
      entry.text.setColor(i === this.index ? this.focusColor : entry.idleColor)
    })
  }

  activate(): void {
    this.entries[this.index]?.activate()
  }

  /** dx, dy 는 -1 / 0 / 1 입니다. */
  move(dx: number, dy: number): void {
    const current = this.entries[this.index]
    if (!current) return

    const cx = current.text.x
    const cy = current.text.y

    let best = -1
    let bestScore = Number.POSITIVE_INFINITY

    this.entries.forEach((entry, i) => {
      if (i === this.index) return

      const along = dx !== 0 ? (entry.text.x - cx) * dx : (entry.text.y - cy) * dy
      // 누른 방향에 있는 것만 후보입니다.
      if (along <= 1) return

      const across = dx !== 0 ? Math.abs(entry.text.y - cy) : Math.abs(entry.text.x - cx)
      const score = along + across * ACROSS_WEIGHT

      if (score < bestScore) {
        bestScore = score
        best = i
      }
    })

    if (best >= 0) this.focusAt(best)
  }
}
