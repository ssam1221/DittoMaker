/**
 * NPC 그림에서 얼굴만 잘라 대화창용 초상화를 만듭니다.
 *
 *   node scripts/make-npc-portraits.mjs           # 전체
 *   node scripts/make-npc-portraits.mjs cook art  # 일부만
 *
 * 입력  public/assets/pokemon/npc/cook.png
 * 출력  public/assets/pokemon/portrait/npc/cook.png  (256x256, 배경 투명)
 *
 * 도감 일러스트와 달리 NPC 그림은 도구를 들거나 탈것에 올라타 있어서
 * make-portraits.mjs 의 자동 추정(위쪽 띠 = 머리)이 잘 빗나갑니다.
 * 예를 들어 build 는 그림의 절반이 망치라 위쪽 띠에 얼굴이 없습니다.
 * 수가 적으니 얼굴 자리를 손으로 적어 둡니다.
 *
 * cx, cy, size 는 모두 그림 크기 대비 0~1 비율입니다.
 * cx, cy 는 잘라낼 정사각형의 가운데, size 는 짧은 변 대비 한 변의 길이입니다.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'public/assets/pokemon/npc')
const OUT_DIR = join(ROOT, 'public/assets/pokemon/portrait/npc')

const OUT_SIZE = 256

/** 얼굴 자리. white-pikachu 는 이벤트용이라 아직 넣지 않습니다. */
const FACES = {
  art: { cx: 0.545, cy: 0.375, size: 0.52 },
  clerk: { cx: 0.486, cy: 0.289, size: 0.625 },
  build: { cx: 0.24, cy: 0.645, size: 0.31 },
  cook: { cx: 0.57, cy: 0.335, size: 0.58 },
  music: { cx: 0.55, cy: 0.57, size: 0.36 },
  nurse: { cx: 0.43, cy: 0.2, size: 0.5 },
  oldstory: { cx: 0.545, cy: 0.35, size: 0.45 },
  prof: { cx: 0.5125, cy: 0.4875, size: 0.55 },
  // --- 수업과 일을 맡은 포켓몬들 (1세대) ---
  butterfree: { cx: 0.43, cy: 0.445, size: 0.42 },
  farfetchd: { cx: 0.42, cy: 0.31, size: 0.36 },
  hypno: { cx: 0.37, cy: 0.36, size: 0.4 },
  kingler: { cx: 0.446, cy: 0.57, size: 0.38 },
  lapras: { cx: 0.4, cy: 0.17, size: 0.3 },
  machamp: { cx: 0.56, cy: 0.38, size: 0.28 },
  magmar: { cx: 0.524, cy: 0.305, size: 0.28 },
  magneton: { cx: 0.48, cy: 0.48, size: 0.62 },
  rhydon: { cx: 0.34, cy: 0.31, size: 0.33 },
  slowbro: { cx: 0.31, cy: 0.24, size: 0.42 },
  venusaur: { cx: 0.34, cy: 0.63, size: 0.5 },
  // --- 체육관에서 상대해 주는 포켓몬들 ---
  magikarp: { cx: 0.21, cy: 0.425, size: 0.48 },
  rattata: { cx: 0.35, cy: 0.47, size: 0.43 },
  onix: { cx: 0.32, cy: 0.46, size: 0.42 },
  marowak: { cx: 0.35, cy: 0.5, size: 0.48 },
  hitmonchan: { cx: 0.72, cy: 0.19, size: 0.36 },
  tauros: { cx: 0.24, cy: 0.43, size: 0.435 },
  alakazam: { cx: 0.525, cy: 0.36, size: 0.34 },
  dragonite: { cx: 0.38, cy: 0.26, size: 0.374 },
}

/** 비율을 실제 픽셀 좌표로. 그림 밖으로 나가지 않게 안쪽으로 밀어 넣습니다. */
function square(face, width, height) {
  const side = Math.round(Math.min(width, height) * face.size)

  return {
    left: Math.max(0, Math.min(Math.round(width * face.cx - side / 2), width - side)),
    top: Math.max(0, Math.min(Math.round(height * face.cy - side / 2), height - side)),
    width: side,
    height: side,
  }
}

async function makePortrait(name) {
  const src = join(SRC_DIR, `${name}.png`)
  const { width, height } = await sharp(src).metadata()

  await sharp(src)
    .extract(square(FACES[name], width, height))
    .resize(OUT_SIZE, OUT_SIZE, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, `${name}.png`))
}

const only = process.argv.slice(2)
const names = Object.keys(FACES).filter((n) => only.length === 0 || only.includes(n))

await mkdir(OUT_DIR, { recursive: true })

const failures = []
for (const name of names) {
  try {
    await makePortrait(name)
    console.log(`  ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

console.log(`\n초상화 ${names.length - failures.length}개 생성`)
if (failures.length) {
  console.log(`실패 ${failures.length}건:`)
  for (const f of failures) console.log(`  ${f}`)
  process.exitCode = 1
}
