import { readFileSync } from 'fs'
import path from 'path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono, type MiddlewareHandler } from 'hono'
import { createApp } from '@/server/app'
import { memoryCache } from '@/server/cache/memory'

const CLIENT_DIR = './dist/client'
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')

const template = readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf-8')
const cache = memoryCache()

// Only paths that look like files are static; `/`, `/show/1`, ... must reach
// the page routes so their <head> gets injected into the template.
const clientStatic = serveStatic({ root: CLIENT_DIR })
const staticFiles: MiddlewareHandler = (c, next) => {
  const last = c.req.path.split('/').pop() ?? ''
  if (!last.includes('.')) {
    return next()
  }
  // Vite's hashed build output never changes under the same name.
  if (c.req.path.startsWith('/assets/')) {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  }
  return clientStatic(c, next)
}

const app = new Hono()
  // User uploads (IMAGE_STORAGE=local): never let a browser sniff them into
  // something executable.
  .use('/uploads/*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff')
    await next()
  })
  .use(
    '/uploads/*',
    serveStatic({
      root: UPLOAD_DIR,
      rewriteRequestPath: (p) => p.replace(/^\/uploads/, ''),
    }),
  )
  .use('*', staticFiles)
  .route(
    '/',
    createApp({
      getTemplate: () => Promise.resolve(template),
      cache: () => cache,
    }),
  )

const port = Number(process.env.PORT) || 3000
serve({ fetch: app.fetch, port }, (info) => {
  console.warn(`Listening on http://${info.address}:${info.port}`)
})
