import { serveStatic } from '@hono/node-server/serve-static'
import type { MiddlewareHandler } from 'hono'

// Serves the built client (dist/client) for the Node server. Only paths that
// look like files are static; `/`, `/show/1`, ... must reach the page routes
// so their <head> gets injected into the template.
export const clientStaticFiles = (root: string): MiddlewareHandler => {
  const clientStatic = serveStatic({ root })
  return async (c, next) => {
    const last = c.req.path.split('/').pop() ?? ''
    if (!last.includes('.')) {
      return next()
    }
    let served = true
    const res = await clientStatic(c, async () => {
      served = false
      await next()
    })
    // Vite's hashed build output never changes under the same name. Only
    // files that exist get this: a 404 for an old chunk must not be cached.
    if (served && res && c.req.path.startsWith('/assets/')) {
      res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }
    return res
  }
}
