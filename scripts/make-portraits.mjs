/**
 * 공식 일러스트에서 머리 부분을 잘라 정사각형 초상화를 만듭니다.
 *
 *   node scripts/make-portraits.mjs                  # 전체
 *   node scripts/make-portraits.mjs 0001 0025 0129   # 파일명 앞 번호로 일부만
 *
 * 입력  public/assets/pokemon/artwork/0001-이상해씨.png
 * 출력  public/assets/pokemon/portrait/0001-이상해씨.png  (256x256, 배경 투명)
 *
 * 얼굴 인식이 아니라 위치 추정입니다. 알파 채널로 피사체 영역을 구한 뒤
 * 그 위쪽 띠를 머리로 보고 잘라냅니다. 대부분 맞지만 가로로 긴 개체나
 * 머리가 몸통 위에 있지 않은 개체는 빗나갈 수 있습니다.
 */

import { mkdir, readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'public/assets/pokemon/artwork')
const OUT_DIR = join(ROOT, 'public/assets/pokemon/portrait')
const OVERRIDES_PATH = join(ROOT, 'scripts/portrait-overrides.json')

const OUT_SIZE = 256
/** 투명으로 볼 알파 기준값 */
const ALPHA_MIN = 16
/** 머리 중심을 찾을 때 볼 위쪽 띠 (피사체 높이 대비) */
const CENTER_BAND = 0.22
/** 잘라낼 정사각형의 한 변 (피사체 높이 대비) */
const HEAD_RATIO = 0.55
/** 결과가 이 비율보다 비어 있으면 머리를 못 찾은 것으로 보고 전신으로 후퇴 */
const FALLBACK_FILL = 0.35

/** 알파가 있는 픽셀들의 경계 상자 */
function boundingBox(data, width, height, channels) {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] < ALPHA_MIN) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * 머리로 추정되는 정사각형 영역을 계산합니다.
 *
 * 크기는 피사체 '높이'에 비례해 정합니다. 위쪽 띠의 가로 폭을 쓰면
 * 날개나 뿔이 넓게 퍼진 개체(리자몽·루기아 등)에서 폭이 부풀어 전신이
 * 잡히기 때문입니다.
 *
 * 위치는 위쪽 띠의 픽셀 무게중심으로 정합니다. 머리는 보통 실루엣
 * 꼭대기에 가장 많은 픽셀을 차지하므로, 좌우로 뻗은 날개보다 머리 쪽으로
 * 중심이 끌립니다.
 */
function headSquare(data, width, height, channels, box) {
  const bandBottom = Math.min(box.y1, Math.round(box.y0 + box.h * CENTER_BAND))

  let weighted = 0
  let count = 0
  for (let y = box.y0; y <= bandBottom; y += 1) {
    for (let x = box.x0; x <= box.x1; x += 1) {
      if (data[(y * width + x) * channels + 3] < ALPHA_MIN) continue
      weighted += x
      count += 1
    }
  }

  const centerX = count > 0 ? weighted / count : (box.x0 + box.x1) / 2

  // 가로로 납작한 개체(잉어킹 등)는 높이 기준이 너무 작아지므로 폭도 함께 봅니다.
  const side = Math.round(
    Math.min(Math.min(width, height), Math.max(box.h * HEAD_RATIO, box.w * 0.45, 96)),
  )

  // 정수리에 여백이 조금 남도록 위쪽으로 살짝 올려 자릅니다.
  const top = Math.round(box.y0 - side * 0.08)
  const left = Math.round(centerX - side / 2)

  return {
    left: Math.max(0, Math.min(left, width - side)),
    top: Math.max(0, Math.min(top, height - side)),
    width: side,
    height: side,
  }
}

/** 잘라낼 영역 안에 피사체 픽셀이 얼마나 차 있는지 */
function fillRatio(data, width, channels, crop) {
  let opaque = 0
  for (let y = crop.top; y < crop.top + crop.height; y += 1) {
    for (let x = crop.left; x < crop.left + crop.width; x += 1) {
      if (data[(y * width + x) * channels + 3] >= ALPHA_MIN) opaque += 1
    }
  }
  return opaque / (crop.width * crop.height)
}

/** 피사체 전체를 담는 정사각형. 머리 추정이 빗나갔을 때의 대비책입니다. */
function wholeSquare(box, width, height) {
  const side = Math.min(Math.min(width, height), Math.max(box.w, box.h))
  return {
    left: Math.max(0, Math.min(Math.round(box.x0 + box.w / 2 - side / 2), width - side)),
    top: Math.max(0, Math.min(Math.round(box.y0 + box.h / 2 - side / 2), height - side)),
    width: side,
    height: side,
  }
}

/**
 * 손으로 지정한 영역을 실제 픽셀 좌표로 바꿉니다.
 * cx, cy, size 는 모두 이미지 크기 대비 0~1 비율입니다.
 */
function overrideSquare(o, width, height) {
  const side = Math.round(Math.min(width, height) * o.size)
  return {
    left: Math.max(0, Math.min(Math.round(width * o.cx - side / 2), width - side)),
    top: Math.max(0, Math.min(Math.round(height * o.cy - side / 2), height - side)),
    width: side,
    height: side,
  }
}

async function makePortrait(fileName, overrides) {
  const src = join(SRC_DIR, fileName)
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const box = boundingBox(data, info.width, info.height, info.channels)
  if (!box) throw new Error('내용이 없는 이미지')

  // 자동 추정이 빗나간 개체는 overrides 파일의 값을 그대로 씁니다.
  const manual = overrides[fileName.slice(0, 4)]
  let crop = manual
    ? overrideSquare(manual, info.width, info.height)
    : headSquare(data, info.width, info.height, info.channels, box)
  let fallback = false

  // 손으로 지정하지 않았는데 결과가 텅 비었다면 머리를 못 찾은 것입니다.
  // 엉뚱한 부위를 확대해 보여주느니 전신을 담는 편이 낫습니다.
  if (!manual && fillRatio(data, info.width, info.channels, crop) < FALLBACK_FILL) {
    crop = wholeSquare(box, info.width, info.height)
    fallback = true
  }

  await sharp(src)
    .extract(crop)
    .resize(OUT_SIZE, OUT_SIZE, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, fileName))

  return fallback
}

let overrides = {}
try {
  overrides = JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'))
} catch {
  // 파일이 없으면 전부 자동 추정으로 진행합니다.
}

const only = process.argv.slice(2)
const files = (await readdir(SRC_DIR))
  .filter((f) => f.endsWith('.png'))
  .filter((f) => only.length === 0 || only.includes(f.slice(0, 4)))

await mkdir(OUT_DIR, { recursive: true })
console.log(`초상화 ${files.length}개 생성 시작`)

let done = 0
const failures = []
const fellBack = []

// sharp 가 내부적으로 스레드를 쓰므로 순차 처리해도 충분히 빠릅니다.
for (const file of files) {
  try {
    if (await makePortrait(file, overrides)) fellBack.push(file)
  } catch (error) {
    failures.push(`${file}: ${error.message}`)
  }
  done += 1
  if (done % 100 === 0 || done === files.length) console.log(`  ${done}/${files.length}`)
}

console.log(`\n완료: ${files.length - failures.length}개`)
console.log(`머리를 못 찾아 전신으로 대체: ${fellBack.length}개`)
if (fellBack.length) {
  console.log('  (얼굴로 맞추려면 scripts/portrait-overrides.json 에 좌표를 넣으세요)')
  for (const f of fellBack) console.log(`  ${f.slice(0, 4)} ${f.slice(5, -4)}`)
}
if (failures.length) {
  console.log(`실패 ${failures.length}건:`)
  for (const f of failures.slice(0, 20)) console.log(`  ${f}`)
  process.exitCode = 1
}
