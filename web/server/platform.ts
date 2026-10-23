import type { Context } from 'hono'
import type { AppCache } from '@/server/cache/types'

// Runtime-specific pieces (Node vs Cloudflare Workers) injected into the app.
export type Platform = {
  getTemplate(c: Context): Promise<string>
  cache(c: Context): AppCache
}
