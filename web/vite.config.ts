import path from 'path'
import { defineConfig } from 'vite-plus'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { honoDev } from './vite/hono-dev'

// `node` builds the client into dist/client for server.ts (Docker) and runs
// the app in the Vite dev server; otherwise the app runs as a Cloudflare
// Worker (worker.ts, configured in cloudflare.config.ts).
const nodeTarget = process.env.WALKLOG_TARGET === 'node'

export default defineConfig({
  // Client env vars keep their Next.js names (inlined at build time).
  envPrefix: 'NEXT_PUBLIC_',
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
      'dist/**',
      '.cloudflare/**',
      'pnpm-lock.yaml',
      // Biome never formatted these
      '**/*.md',
      '**/*.yaml',
    ],
  },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    ignorePatterns: [
      '.next/**',
      'out/**',
      'public/**',
      'coverage/**',
      'dist/**',
      '.cloudflare/**',
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
      // Builds the client assets and the Worker (worker.ts) into the Build
      // Output that cf deploys.
      'cf-build': {
        command: 'CF_WORKERS_BUILD=1 vp build',
        cache: false,
      },
      'cf-dev': {
        command: 'vp dev --port 3001',
        cache: false,
      },
      preview: {
        command: 'vp preview',
        dependsOn: ['cf-build'],
        cache: false,
      },
      deploy: {
        command: 'cf deploy --prebuilt',
        dependsOn: ['cf-build'],
        cache: false,
      },
      // Uploads a new Worker version without routing traffic to it.
      upload: {
        command: 'cf workers versions create --prebuilt',
        dependsOn: ['cf-build'],
        cache: false,
      },
      'cf-typegen': {
        command: 'cf workers types',
        cache: false,
      },
    },
  },
  staged: {
    '*.{js,mjs,ts,tsx}': 'vp check --fix',
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
    // pglite (used by server/services/walks.test.ts) can take several seconds
    // to boot its WASM postgres + postgis extension on a cold run.
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

  // Node server bundle (`vp pack`, part of `vp run build`): server.ts into
  // dist/node/server.js. package.json dependencies stay external and are
  // loaded from node_modules at runtime.
  pack: {
    entry: ['server.ts'],
    outDir: 'dist/node',
    format: 'esm',
    platform: 'node',
    fixedExtension: false,
    dts: false,
    alias: { '@': path.resolve(__dirname, '.') },
    // Only imported (dynamically) on Workers; see lib/drizzle/db.ts.
    deps: { neverBundle: ['cloudflare:workers'] },
  },
  build: nodeTarget ? { outDir: 'dist/client' } : undefined,
  environments: process.env.VITEST
    ? undefined
    : {
        client: {
          // Browser code shared with the server (lib/utils/geo-utils.ts,
          // elevation-box.tsx) reads non-public process.env keys. As under
          // Next.js they are unset in the browser; server environments keep
          // reading the real env at runtime.
          define: { 'process.env': '{}' },
        },
      },

  // Skipped under Vitest: the tests render components directly in jsdom and
  // must not boot workerd.
  plugins: process.env.VITEST
    ? []
    : [
        react(),
        {
          // wkx (lib/utils/geo-utils.ts, also used in the browser) calls
          // require('util').inherits. Vite stubs out Node built-ins for the
          // browser, so point the client build at the npm `util` package
          // instead. Server environments keep the real node:util.
          name: 'walklog:client-util-polyfill',
          applyToEnvironment: (environment) => environment.name === 'client',
          resolveId(id, importer) {
            if (id === 'util') {
              return this.resolve('util/', importer, { skipSelf: true })
            }
          },
        },
        // Reads cloudflare.config.ts.
        nodeTarget ? honoDev() : cloudflare(),
      ],
})
