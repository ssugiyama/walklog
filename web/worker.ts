import { Hono } from 'hono'
import { createApp } from '@/server/app'
import { kvCache, type KVNamespace } from '@/server/cache/kv'

// Structural subset of the bindings declared in cloudflare.config.ts (the
// generated .cloudflare/types are gitignored, so CI's type check lacks them).
type Bindings = {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> }
  CACHE_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()
  .route(
    '/',
    createApp({
      // `/` rather than `/index.html`: the assets layer redirects the latter
      // to the former (html_handling: auto-trailing-slash).
      getTemplate: (c) =>
        c.env.ASSETS.fetch(new URL('/', c.req.url)).then((r) => r.text()),
      cache: (c) => kvCache(c.env.CACHE_KV),
    }),
  )
  // Paths the app does not handle (favicon, icons, other public files) are
  // static assets: runWorkerFirst sends them here first.
  .notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default { fetch: app.fetch }
