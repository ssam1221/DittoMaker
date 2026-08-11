import { defineConfig } from 'vite'

export default defineConfig({
  // itch.io / GitHub Pages 처럼 하위 경로에 올려도 동작하도록 상대 경로 사용
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    // 게임 에셋은 인라인 처리하지 않고 파일로 그대로 내보냄
    assetsInlineLimit: 0,
  },
})
