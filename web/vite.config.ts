import path from 'path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    // Keep the style Biome used so the formatter switch is a no-op.
    singleQuote: true,
    semi: false,
    printWidth: 80,
    ignorePatterns: [
      '.next/**',
      'out/**',
      'public/**',
      'coverage/**',
      '.open-next/**',
      'pnpm-lock.yaml',
      // Biome never formatted these
      '**/*.md',
      '**/*.yaml',
      'wrangler.jsonc',
    ],
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    ignorePatterns: [
      '.next/**',
      'out/**',
      'public/**',
      'coverage/**',
      '.open-next/**',
      '*.config.*',
    ],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      // Ported from biome.json
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'typescript/no-explicit-any': 'error',
      'require-await': 'error',
      'no-unused-vars': ['error', { args: 'none' }],
      // tsconfig has `strict: false`, so this rule can't work and only warns.
      'typescript/no-useless-default-assignment': 'off',
    },
    overrides: [
      { files: ['bin/**/*.js'], rules: { 'no-console': 'off' } },
      // async mocks intentionally return promises without awaiting
      {
        files: ['**/*.test.{ts,tsx}'],
        rules: { 'require-await': 'off', 'typescript/unbound-method': 'off' },
      },
    ],
    options: { typeAware: true, typeCheck: true },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // describe や expect などをグローバル（明示的なimportなし）で使いたい場合
    globals: true,
    // ブラウザ環境（React や Vue などのコンポーネントテスト用）
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // pglite (used by app/lib/walk-actions.test.ts) can take several seconds to
    // boot its WASM postgres + postgis extension on a cold run.
    hookTimeout: 20000,
    testTimeout: 20000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
    ],
    coverage: {
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['text', 'json-summary', 'json'],
      // If you want a coverage reports even if your tests are failing, include the reportOnFailure option
      reportOnFailure: true,
    },
  },
})
