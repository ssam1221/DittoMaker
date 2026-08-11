/** 게임 내부 해상도. 화면 크기에 맞춰 자동으로 확대/축소됩니다. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

/** 씬 키 — 문자열 오타를 막기 위해 한 곳에서 관리합니다. */
export const SceneKey = {
  Boot: 'Boot',
  Menu: 'Menu',
  Settings: 'Settings',
  Setup: 'Setup',
  Dialogue: 'Dialogue',
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
  Setup: 'setup',
  Coronet: 'coronet',
} as const

/** 배경음 파일 이름 (public/music/ 기준) */
export const MusicFile = {
  Opening: 'opening.mp3',
  Setup: '1-05. Professor Oak.mp3',
  Coronet: '1-62 - Coronet Highlands - Base.mp3',
} as const

/** 게임 메인 폰트. index.html 의 @font-face 이름과 같아야 합니다. */
export const MAIN_FONT = 'PokemonBW'

/** 폰트 스택 — 폰트에 없는 글자는 Malgun Gothic 으로 대체됩니다. */
export const FontFamily = {
  Title: `"${MAIN_FONT}", Georgia, "Times New Roman", serif`,
  Body: `"${MAIN_FONT}", "Segoe UI", "Malgun Gothic", sans-serif`,
  /**
   * 달력 날짜처럼 아주 작게 찍어야 하는 곳에 씁니다.
   * 픽셀 폰트는 작은 크기에서 획이 뭉개져 숫자를 읽기 어렵습니다.
   */
  Plain: '"Segoe UI", "Malgun Gothic", sans-serif',
} as const

/** localStorage 세이브 슬롯 키 */
export const SAVE_KEY = 'ditto-maker.save'
