/** 게임 내부 해상도. 화면 크기에 맞춰 자동으로 확대/축소됩니다. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

/** 씬 키 — 문자열 오타를 막기 위해 한 곳에서 관리합니다. */
export const SceneKey = {
  Boot: 'Boot',
  Menu: 'Menu',
  Game: 'Game',
} as const

/** 텍스처 키 */
export const TextureKey = {
  Logo: 'ditto-logo',
  Player: 'player',
  Ground: 'ground',
  Coin: 'coin',
} as const

/** 오디오 키 */
export const AudioKey = {
  Opening: 'opening',
} as const

/** 게임 메인 폰트. index.html 의 @font-face 이름과 같아야 합니다. */
export const MAIN_FONT = 'PokemonBW'

/** 폰트 스택 — 폰트에 없는 글자는 Malgun Gothic 으로 대체됩니다. */
export const FontFamily = {
  Title: `"${MAIN_FONT}", Georgia, "Times New Roman", serif`,
  Body: `"${MAIN_FONT}", "Segoe UI", "Malgun Gothic", sans-serif`,
} as const

/** localStorage 세이브 슬롯 키 */
export const SAVE_KEY = 'ditto-maker.save'
