import { Hono } from 'hono'
import type { Platform } from '@/server/platform'
import { createApiRoutes } from '@/server/routes/api'
import { createPageRoutes } from '@/server/routes/pages'

export const createApp = (platform: Platform) =>
  new Hono()
    .route('/api', createApiRoutes(platform))
    .route('/', createPageRoutes(platform))

export type AppType = ReturnType<typeof createApp>
