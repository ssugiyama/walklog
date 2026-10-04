import { bindings, defineConfig, defineWorker } from 'cf/config'

// Resource ids aren't meaningful to share across deployments, so they come
// from env vars instead of being hardcoded here (see README.md). They're
// only required for the deployable build (`vp run cf-build` sets
// CF_WORKERS_BUILD): local dev/preview simulates KV and connects to
// Hyperdrive's dev.connectionString, so any id works there - and `vp check`
// loads this file too, without any of these set.
const requireEnv = (name: string, createCommand: string): string => {
  const value = process.env[name]
  if (!value) {
    if (!process.env.CF_WORKERS_BUILD) return `local-${name.toLowerCase()}`
    throw new Error(
      `${name} is not set. Run \`${createCommand}\` (see README.md), ` +
        `then export the id it prints, e.g.:\n` +
        `  export ${name}=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
    )
  }
  return value
}

export default defineConfig({
  worker: defineWorker({
    name: 'walklog',
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-07-27',
    compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
    observability: { enabled: true },
    assets: {
      // "/*" routes everything to the Worker by default (needed because a
      // Server Action POST to a path that also matches a static/prerendered
      // asset, e.g. `/`, would otherwise be served directly by the assets
      // layer without ever invoking the Worker, and 500 before our code
      // runs). The negative rule excludes hashed `_next/static/*` build
      // assets, which are immutable and never a Server Action target, so
      // those are served straight from Cloudflare's edge asset cache (see
      // public/_headers) instead of paying for a Worker invocation on every
      // request.
      runWorkerFirst: ['/*', '!/_next/static/*'],
    },
    env: {
      ASSETS: bindings.assets(),
      // Tells lib/drizzle/db.ts to create a fresh DB client per request
      // instead of a module-level singleton, since Workers forbids reusing
      // a TCP socket across requests. This is the only var that belongs
      // here: it's a fixed property of this deployment target, not
      // per-deployer config. Everything else (SITE_NAME, FIREBASE_*, R2_*,
      // ...) is set as a Worker secret instead - see README.md.
      CF_WORKERS: bindings.text('true'),
      // Hyperdrive terminates the actual TLS connection to Supabase and
      // pools it, so the app never sees DB_URL on this path (see
      // lib/drizzle/db.ts) - direct TLS from a Worker to Supabase hits
      // multiple options unsupported by Workers' TLS implementation
      // (rejectUnauthorized, ALPNProtocols) or hangs.
      HYPERDRIVE: bindings.hyperdrive({
        id: requireEnv(
          'HYPERDRIVE_ID',
          'cf hyperdrive create walklog-db --connection-string=...',
        ),
        dev: {
          // Hyperdrive can't be reached from outside Cloudflare's network,
          // so local dev/preview connects to this database directly.
          connectionString:
            process.env
              .CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE,
        },
      }),
      // Backs vinext's data cache (the `'use cache'` functions and
      // `cacheTag`/`updateTag` in lib/actions/walk-actions.ts - see
      // kvDataAdapter() in vite.config.ts). Binding name is fixed by
      // @vinext/cloudflare's KV adapter.
      VINEXT_KV_CACHE: bindings.kv({
        id: requireEnv('KV_CACHE_ID', 'cf kv namespaces create walklog-cache'),
      }),
    },
  }),
})
