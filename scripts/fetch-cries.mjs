/**
 * 포켓몬 울음소리를 내려받습니다.
 *
 *   node scripts/fetch-cries.mjs            # 전체 (1~1025)
 *   node scripts/fetch-cries.mjs 1 151      # 범위 지정
 *
 * 출력  public/sfx/voice/0493-아르세우스.ogg
 *
 * 이름은 public/data/pokemon-info.json 에서 가져오므로,
 * 먼저 `npm run fetch:pokemon` 을 돌려 두어야 합니다.
 * 이미 받은 파일은 건너뛰므로 중간에 끊겨도 다시 실행하면 이어집니다.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public/sfx/voice')
const INFO_PATH = join(ROOT, 'public/data/pokemon-info.json')

const CRY_URL = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`

const CONCURRENCY = 8

const [fromArg, toArg] = process.argv.slice(2)
const FROM = Number(fromArg) || 1
const TO = Number(toArg) || 1025

/** 이름을 파일명으로 쓸 수 있게 다듬습니다. (이미지 쪽과 같은 규칙) */
function toFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '')
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function withRetry(label, fn, attempts = 4) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (error?.fatal) break
      await new Promise((r) => setTimeout(r, 400 * 2 ** i))
    }
  }
  throw new Error(`${label}: ${lastError?.message ?? lastError}`)
}

async function download(url, path) {
  if (await exists(path)) return 'skipped'

  await withRetry(url, async () => {
    const res = await fetch(url)
    // 울음소리가 없는 개체도 있을 수 있으니 404 는 재시도하지 않습니다.
    if (res.status === 404) throw Object.assign(new Error('HTTP 404'), { fatal: true })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length === 0) throw new Error('빈 파일')
    await writeFile(path, buffer)
  })

  return 'downloaded'
}

async function pool(items, limit, worker) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < items.length) {
        await worker(items[cursor++])
      }
    }),
  )
}

const info = JSON.parse(await readFile(INFO_PATH, 'utf8'))
const byNo = new Map(info.map((p) => [p.no, p.name]))

const ids = Array.from({ length: TO - FROM + 1 }, (_, i) => FROM + i).filter((id) => byNo.has(id))

await mkdir(OUT_DIR, { recursive: true })
console.log(`울음소리 ${ids.length}개 수집 시작 (#${FROM} ~ #${TO})`)

let done = 0
let downloaded = 0
const failures = []

await pool(ids, CONCURRENCY, async (id) => {
  const fileName = `${String(id).padStart(4, '0')}-${toFileName(byNo.get(id))}.ogg`

  try {
    if ((await download(CRY_URL(id), join(OUT_DIR, fileName))) === 'downloaded') downloaded += 1
  } catch (error) {
    failures.push({ id, message: String(error.message ?? error) })
  }

  done += 1
  if (done % 100 === 0 || done === ids.length) {
    console.log(`  ${done}/${ids.length}  (신규 ${downloaded}개)`)
  }
})

console.log(`\n완료: ${ids.length - failures.length}개`)
if (failures.length) {
  console.log(`실패 ${failures.length}건:`)
  for (const f of failures.slice(0, 20)) console.log(`  #${f.id}  ${f.message}`)
  process.exitCode = 1
}
