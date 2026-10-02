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
  run: {
    // Cloudflare Workers pipeline. Not cached: the build inlines NEXT_PUBLIC_*
    // env vars and deploy has side effects.
    tasks: {
      'render-wrangler-config': {
        command: 'node scripts/render-wrangler-config.mjs',
        cache: false,
      },
      'cf-build': {
        command:
          'opennextjs-cloudflare build --config .wrangler.generated.jsonc',
        dependsOn: ['render-wrangler-config'],
        cache: false,
      },
      preview: {
        command:
          'opennextjs-cloudflare populateCache local --config .wrangler.generated.jsonc && opennextjs-cloudflare preview --config .wrangler.generated.jsonc',
        dependsOn: ['cf-build'],
        cache: false,
      },
      deploy: {
        command:
          'opennextjs-cloudflare populateCache remote --config .wrangler.generated.jsonc && opennextjs-cloudflare deploy --config .wrangler.generated.jsonc',
        dependsOn: ['cf-build'],
        cache: false,
      },
      upload: {
        command:
          'opennextjs-cloudflare populateCache remote --config .wrangler.generated.jsonc && opennextjs-cloudflare upload --config .wrangler.generated.jsonc',
        dependsOn: ['cf-build'],
        cache: false,
      },
      'cf-typegen': {
        command:
          'wrangler types --config .wrangler.generated.jsonc --env-interface CloudflareEnv cloudflare-env.d.ts',
        dependsOn: ['render-wrangler-config'],
        cache: false,
      },
    },
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
