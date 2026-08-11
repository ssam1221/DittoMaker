/**
 * 포켓몬 이미지와 정보를 내려받습니다.
 *
 *   node scripts/fetch-pokemon.mjs            # 전체 (1~1025)
 *   node scripts/fetch-pokemon.mjs 1 151      # 범위 지정
 *
 * 결과물
 *   public/assets/pokemon/sprite/0001-이상해씨.png    도트 스프라이트
 *   public/assets/pokemon/artwork/0001-이상해씨.png   공식 일러스트
 *   public/data/pokemon-info.json                     이름·설명·타입·분류 등
 *
 * 이미 받은 이미지는 건너뛰므로 중간에 끊겨도 다시 실행하면 이어서 받습니다.
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SPRITE_DIR = join(ROOT, 'public/assets/pokemon/sprite')
const ARTWORK_DIR = join(ROOT, 'public/assets/pokemon/artwork')
const INFO_PATH = join(ROOT, 'public/data/pokemon-info.json')

const API = 'https://pokeapi.co/api/v2'
const SPRITE_URL = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
const ARTWORK_URL = (id) =>
  `https://data1.pokemonkorea.co.kr/newdata/pokedex/full/${String(id).padStart(4, '0')}01.png`
// 포켓몬코리아에 파일이 없는 개체(#131 등)를 위한 대체 주소
const ARTWORK_FALLBACK_URL = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

// 공개 API 이므로 동시 요청 수를 낮게 유지합니다.
const CONCURRENCY = 6

const [fromArg, toArg] = process.argv.slice(2)
const FROM = Number(fromArg) || 1
const TO = Number(toArg) || 1025

/** 이름을 파일명으로 쓸 수 있게 다듬습니다. (예: "타입:널" -> "타입널") */
function toFileName(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '')
}

/** 한국어 항목을 고릅니다. 없으면 영어, 그것도 없으면 첫 번째. */
function pickKorean(entries, field = 'name') {
  const ko = entries.filter((e) => e.language?.name === 'ko')
  const en = entries.filter((e) => e.language?.name === 'en')
  const chosen = ko.at(-1) ?? en.at(-1) ?? entries.at(-1)
  return chosen?.[field] ?? null
}

/** 도감 설명은 줄바꿈·제어문자가 섞여 있어 한 줄로 정리합니다. */
function cleanText(text) {
  return text ? text.replace(/[\n\f\r­]/g, ' ').replace(/\s+/g, ' ').trim() : null
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
      // 404 처럼 다시 시도해도 소용없는 오류는 즉시 포기합니다.
      if (error?.fatal) break
      // 400ms, 800ms, 1600ms ... 로 물러섰다가 다시 시도
      await new Promise((r) => setTimeout(r, 400 * 2 ** i))
    }
  }
  throw new Error(`${label}: ${lastError?.message ?? lastError}`)
}

async function fetchJson(url) {
  return withRetry(url, async () => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })
}

/**
 * urls 를 순서대로 시도합니다. 앞의 주소가 404 면 다음 주소로 넘어갑니다.
 * (일시적인 오류는 withRetry 가 재시도하고, 없는 파일은 곧바로 다음 후보로)
 */
async function download(urls, path) {
  if (await exists(path)) return 'skipped'

  const candidates = Array.isArray(urls) ? urls : [urls]
  let lastError

  for (const url of candidates) {
    try {
      await withRetry(url, async () => {
        const res = await fetch(url)
        if (res.status === 404) throw Object.assign(new Error('HTTP 404'), { fatal: true })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length === 0) throw new Error('빈 파일')
        await writeFile(path, buffer)
      })
      return 'downloaded'
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

// 타입·특성 이름은 종류가 적어서 한 번 받아두고 재사용합니다.
const nameCache = new Map()
async function koreanNameOf(url) {
  if (!nameCache.has(url)) {
    nameCache.set(
      url,
      fetchJson(url).then((d) => pickKorean(d.names)),
    )
  }
  return nameCache.get(url)
}

/** gender_rate: -1 무성, 그 외 8분의 몇이 암컷인지 */
function readGender(rate) {
  if (rate === -1) return { genderless: true, male: false, female: false, femaleRatio: null }
  return {
    genderless: false,
    male: rate < 8,
    female: rate > 0,
    femaleRatio: rate / 8,
  }
}

async function collect(id) {
  const [species, pokemon] = await Promise.all([
    fetchJson(`${API}/pokemon-species/${id}`),
    fetchJson(`${API}/pokemon/${id}`),
  ])

  const name = pickKorean(species.names)
  const fileName = `${String(id).padStart(4, '0')}-${toFileName(name)}.png`

  const [types, abilities] = await Promise.all([
    Promise.all(pokemon.types.map((t) => koreanNameOf(`${API}/type/${t.type.name}`))),
    Promise.all(
      pokemon.abilities.map(async (a) => ({
        name: await koreanNameOf(`${API}/ability/${a.ability.name}`),
        hidden: a.is_hidden,
      })),
    ),
  ])

  const [sprite, artwork] = await Promise.all([
    download(SPRITE_URL(id), join(SPRITE_DIR, fileName)),
    download([ARTWORK_URL(id), ARTWORK_FALLBACK_URL(id)], join(ARTWORK_DIR, fileName)),
  ])

  return {
    result: {
      no: id,
      name,
      genus: pickKorean(species.genera, 'genus'), // 분류 (예: 씨앗포켓몬)
      description: cleanText(pickKorean(species.flavor_text_entries, 'flavor_text')),
      types,
      abilities,
      gender: readGender(species.gender_rate),
      heightM: pokemon.height / 10, // API 는 데시미터
      weightKg: pokemon.weight / 10, // API 는 헥토그램
      image: {
        sprite: `assets/pokemon/sprite/${fileName}`,
        artwork: `assets/pokemon/artwork/${fileName}`,
      },
    },
    downloaded: [sprite, artwork].filter((s) => s === 'downloaded').length,
  }
}

async function pool(items, limit, worker) {
  const out = new Array(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < items.length) {
        const index = cursor++
        out[index] = await worker(items[index], index)
      }
    }),
  )
  return out
}

const ids = Array.from({ length: TO - FROM + 1 }, (_, i) => FROM + i)

await mkdir(SPRITE_DIR, { recursive: true })
await mkdir(ARTWORK_DIR, { recursive: true })
await mkdir(dirname(INFO_PATH), { recursive: true })

console.log(`포켓몬 ${ids.length}마리 수집 시작 (#${FROM} ~ #${TO})`)

let done = 0
let downloaded = 0
const failures = []

const collected = await pool(ids, CONCURRENCY, async (id) => {
  try {
    const { result, downloaded: n } = await collect(id)
    downloaded += n
    done += 1
    if (done % 25 === 0 || done === ids.length) {
      console.log(`  ${done}/${ids.length}  (이미지 ${downloaded}개 신규)`)
    }
    return result
  } catch (error) {
    failures.push({ id, message: String(error.message ?? error) })
    done += 1
    return null
  }
})

const list = collected.filter(Boolean).sort((a, b) => a.no - b.no)
await writeFile(INFO_PATH, JSON.stringify(list, null, 2) + '\n', 'utf8')

console.log(`\n완료: ${list.length}마리 저장 -> ${INFO_PATH.replace(ROOT, '.')}`)
console.log(`이미지 신규 ${downloaded}개`)

if (failures.length) {
  console.log(`\n실패 ${failures.length}건 (다시 실행하면 이어서 받습니다):`)
  for (const f of failures.slice(0, 20)) console.log(`  #${f.id}  ${f.message}`)
  process.exitCode = 1
}
