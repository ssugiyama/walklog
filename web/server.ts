import { readFileSync } from 'fs'
import path from 'path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { createApp } from '@/server/app'
import { memoryCache } from '@/server/cache/memory'
import { clientStaticFiles } from '@/server/node-static'

const CLIENT_DIR = './dist/client'
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')

const template = readFileSync(path.join(CLIENT_DIR, 'index.html'), 'utf-8')
const cache = memoryCache()

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
  .use('*', clientStaticFiles(CLIENT_DIR))
  .route(
    '/',
    createApp({
      getTemplate: () => Promise.resolve(template),
      cache: () => cache,
    }),
  )

const port = Number(process.env.PORT) || 3000
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.warn(`Listening on http://${info.address}:${info.port}`)
})

// As PID 1 in Docker, Node gets no default signal handlers: without these,
// `docker stop` waits for its timeout and then SIGKILLs the server.
const shutdown = () => {
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
