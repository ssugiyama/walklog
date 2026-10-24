import { readFileSync } from 'fs'
import path from 'path'
import { getRequestListener } from '@hono/node-server'
import {
  isRunnableDevEnvironment,
  loadEnv,
  type Plugin,
  type ViteDevServer,
} from 'vite-plus'
import type { createApp as CreateApp } from '../server/app'
import { memoryCache } from '../server/cache/memory'

// Vite's own requests (client, HMR, transformed sources, deps) and files
// (anything with an extension) stay with Vite; the rest is the Hono app.
const isAppRequest = (pathname: string): boolean => {
  if (pathname.startsWith('/api/') || pathname === '/manifest.webmanifest') {
    return true
  }
  if (/^\/(@|__|src\/|node_modules\/)/.test(pathname)) {
    return false
  }
  return !(pathname.split('/').pop() ?? '').includes('.')
}

// Like `next dev`, expose .env / .env.local / .env.[mode] to server code via
// process.env (Vite itself only loads them into import.meta.env).
const loadServerEnv = (server: ViteDevServer) => {
  const env = loadEnv(server.config.mode, server.config.envDir || '.', '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }
}

// Runs the Hono app (server/app.ts) inside the Vite dev server for the Node
// target, through the SSR environment so server code gets HMR too.
export const honoDev = (): Plugin => ({
  name: 'walklog:hono-dev',
  configureServer(server) {
    loadServerEnv(server)
    const ssr = server.environments.ssr
    if (!isRunnableDevEnvironment(ssr)) {
      throw new Error('honoDev needs a runnable ssr environment')
    }
    const cache = memoryCache()
    const indexHtml = path.join(server.config.root, 'index.html')

    const listener = getRequestListener(async (request) => {
      const { createApp } = (await ssr.runner.import('/server/app.ts')) as {
        createApp: typeof CreateApp
      }
      const app = createApp({
        getTemplate: (c) =>
          server.transformIndexHtml(
            new URL(c.req.url).pathname,
            readFileSync(indexHtml, 'utf-8'),
          ),
        cache: () => cache,
      })
      return app.fetch(request)
    })

    server.middlewares.use((req, res, next) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
      if (!isAppRequest(pathname)) {
        return next()
      }
      listener(req, res).catch(next)
    })
  },
})
