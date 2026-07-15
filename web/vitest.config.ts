// vitest.config.ts または vite.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // describe や expect などをグローバル（明示的なimportなし）で使いたい場合
    globals: true,
    // ブラウザ環境（React や Vue などのコンポーネントテスト用）
    environment: 'jsdom',
  },
})
