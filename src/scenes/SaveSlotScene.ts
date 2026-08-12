import Phaser from 'phaser'

import { FontFamily, GAME_HEIGHT, GAME_WIDTH, SceneKey } from '../constants'
import { clearSlot, describeSlot, listSlots, SLOT_COUNT, writeSlot, type SaveData } from '../save'
import { askConfirm, type ConfirmDialog } from '../ui/confirm'
import { addChoice, drawInnerPanel, drawParchmentFrame, PanelColor } from '../ui/panel'

// 열 줄과 아래 안내가 모두 들어가도록 잡은 크기입니다.
const PANEL = { x: 60, y: 48, width: GAME_WIDTH - 120, height: 404 }

const ROW_TOP = PANEL.y + 46
const ROW_GAP = 36
const LABEL_X = PANEL.x + 30
const DELETE_X = PANEL.x + PANEL.width - 40

const COLOR_IDLE = '#e8dfc4'
const COLOR_SELECTED = '#ffd447'
const COLOR_EMPTY = '#7b7159'
const COLOR_DELETE = '#e08a8a'

/** 이 화면을 어떤 목적으로 열었는지 */
export type SlotMode = 'load' | 'save'

export interface SlotSceneData {
  mode: SlotMode
  /** save 일 때 기록할 내용 */
  pending?: SaveData
}

interface Row {
  no: number
  label: Phaser.GameObjects.Text
  remove?: Phaser.GameObjects.Text
  filled: boolean
}

/**
 * 세이브 슬롯 목록입니다. 불러오기와, 새 판을 어디에 넣을지 고르는 데
 * 함께 씁니다. 각 줄 오른쪽의 X 로 그 슬롯만 지웁니다.
 */
export class SaveSlotScene extends Phaser.Scene {
  private mode: SlotMode = 'load'
  private pending?: SaveData
  private rows: Row[] = []
  /** 커서 위치: 줄 번호와, 그 줄에서 X 에 가 있는지 */
  private selected = 0
  private onDelete = false
  private dialog?: ConfirmDialog

  constructor() {
    super(SceneKey.Slots)
  }

  init(data: SlotSceneData): void {
    this.mode = data.mode ?? 'load'
    this.pending = data.pending
  }

  create(): void {
    this.rows = []
    this.selected = 0
    this.onDelete = false
    this.dialog = undefined

    drawParchmentFrame(this)
    drawInnerPanel(this, PANEL, PanelColor.Night)

    this.add
      .text(
        GAME_WIDTH / 2,
        PANEL.y + 14,
        this.mode === 'load' ? '불러오기' : '어느 슬롯에 저장할까요?',
        { fontFamily: FontFamily.Body, fontSize: '24px', color: '#f6efdc' },
      )
      .setOrigin(0.5, 0)

    this.createRows()

    addChoice(this, GAME_WIDTH / 2, PANEL.y + PANEL.height + 26, '돌아가기', () => this.leave(), {
      fontSize: '22px',
    })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '↑ ↓ 슬롯    ← → X 선택    Enter 확인    Esc 뒤로', {
        fontFamily: FontFamily.Body,
        fontSize: '15px',
        color: '#7c6a4a',
      })
      .setOrigin(0.5, 1)

    this.bindKeyboard()
    this.refresh()
    this.cameras.main.fadeIn(250, 0, 0, 0)
  }

  private createRows(): void {
    listSlots().forEach((slot, index) => {
      const y = ROW_TOP + index * ROW_GAP
      const filled = slot.data !== null

      const label = addChoice(
        this,
        LABEL_X,
        y,
        `${String(slot.no).padStart(2, ' ')}.  ${describeSlot(slot.data)}`,
        () => {
          this.selected = index
          this.onDelete = false
          this.refresh()
          this.activate()
        },
        {
          fontSize: '19px',
          origin: [0, 0.5],
          onFocus: () => {
            this.selected = index
            this.onDelete = false
            this.refresh()
          },
        },
      )

      const row: Row = { no: slot.no, label, filled }

      // 빈 슬롯에는 지울 것이 없습니다.
      if (filled) {
        row.remove = addChoice(
          this,
          DELETE_X,
          y,
          'X',
          () => {
            this.selected = index
            this.onDelete = true
            this.refresh()
            this.askDelete()
          },
          {
            fontSize: '20px',
            onFocus: () => {
              this.selected = index
              this.onDelete = true
              this.refresh()
            },
          },
        )
      }

      this.rows.push(row)
    })
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard!

    keyboard.on('keydown-UP', () => this.moveRow(-1))
    keyboard.on('keydown-DOWN', () => this.moveRow(1))
    keyboard.on('keydown-LEFT', () => this.moveSide(-1))
    keyboard.on('keydown-RIGHT', () => this.moveSide(1))
    keyboard.on('keydown-ENTER', () => this.onEnter())
    keyboard.on('keydown-ESC', () => this.onEscape())
  }

  private moveRow(delta: number): void {
    if (this.dialog) return

    this.selected = (this.selected + delta + SLOT_COUNT) % SLOT_COUNT
    // 지울 수 없는 줄로 옮겼다면 커서를 이름 쪽으로 되돌립니다.
    if (!this.rows[this.selected]?.remove) this.onDelete = false
    this.refresh()
  }

  private moveSide(delta: number): void {
    if (this.dialog) {
      this.dialog.moveSelection(delta)
      return
    }

    if (delta > 0 && this.rows[this.selected]?.remove) this.onDelete = true
    if (delta < 0) this.onDelete = false
    this.refresh()
  }

  private onEnter(): void {
    if (this.dialog) {
      this.dialog.submit()
      return
    }

    if (this.onDelete) {
      this.askDelete()
      return
    }

    this.activate()
  }

  private onEscape(): void {
    if (this.dialog) {
      this.dialog.cancel()
      return
    }
    this.leave()
  }

  /** 슬롯을 골랐을 때 — 불러오거나, 저장하거나 */
  private activate(): void {
    const row = this.rows[this.selected]
    if (!row) return

    if (this.mode === 'load') {
      // 빈 슬롯은 불러올 것이 없습니다.
      if (!row.filled) return

      const data = listSlots()[this.selected]?.data
      if (!data) return

      this.leaveTo(SceneKey.Dialogue, data)
      return
    }

    if (!this.pending) return

    if (row.filled) {
      this.confirm(
        `${row.no}번 슬롯에 덮어쓰시겠습니까?`,
        '슬롯에 있던 기록은 사라집니다.',
        () => this.saveInto(row.no),
      )
      return
    }

    this.saveInto(row.no)
  }

  private saveInto(slot: number): void {
    if (!this.pending) return

    writeSlot(slot, this.pending)
    this.leaveTo(SceneKey.Dialogue, this.pending)
  }

  private askDelete(): void {
    const row = this.rows[this.selected]
    if (!row?.filled) return

    this.confirm(`${row.no}번 슬롯을 삭제하시겠습니까?`, '되돌릴 수 없습니다.', () => {
      clearSlot(row.no)
      // 목록을 다시 그리는 편이 줄마다 손보는 것보다 깔끔합니다.
      this.scene.restart({ mode: this.mode, pending: this.pending } satisfies SlotSceneData)
    })
  }

  private confirm(question: string, warning: string, onConfirm: () => void): void {
    this.dialog = askConfirm(this, {
      question,
      warning,
      onConfirm: () => {
        this.dialog = undefined
        onConfirm()
      },
      onCancel: () => {
        this.dialog = undefined
      },
    })
  }

  private refresh(): void {
    this.rows.forEach((row, index) => {
      const active = index === this.selected

      row.label.setColor(
        active && !this.onDelete ? COLOR_SELECTED : row.filled ? COLOR_IDLE : COLOR_EMPTY,
      )
      row.remove?.setColor(active && this.onDelete ? COLOR_SELECTED : COLOR_DELETE)
    })
  }

  private leaveTo(scene: string, data: SaveData): void {
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(scene, data)
    })
  }

  private leave(): void {
    this.scene.start(SceneKey.Menu)
  }
}
