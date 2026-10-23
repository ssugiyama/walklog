import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import { z } from 'zod'
import { getAuth } from '@/lib/auth'
import { idParamSchema } from '@/lib/utils/search-params-schema'
import { HttpError } from '@/server/http-error'
import type { Platform } from '@/server/platform'
import { getSelfStatus, getUid } from '@/server/services/session'
import {
  deleteItem,
  getCities,
  getItem,
  getUsers,
  search,
  updateItem,
} from '@/server/services/walks'

// Image limit is 2MB; the rest of the multipart body gets 1MB of headroom.
const MAX_BODY_SIZE = 3 * 1024 * 1024

// Shape only: value-level validation (and its messages) lives in the service.
const searchBodySchema = z.object({
  date: z.string().optional(),
  user: z.string().optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  filter: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  center: z.string().optional(),
  radius: z.string().optional(),
  cities: z.string().optional(),
  path: z.string().optional(),
  max_distance: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  order: z.string().optional(),
})

const cityParamsSchema = z.object({
  jcodes: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

const idParam = z.object({ id: idParamSchema })

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
// better-auth does its own origin validation.
const AUTH_PATH = /^(\/api)?\/auth(\/|$)/

const originHost = (origin: string) => {
  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}

// Same rule as Next.js Server Actions: only the host is compared, so a
// TLS-terminating proxy (https Origin, http request URL) still works.
const requestHost = (c: Context) =>
  c.req.header('x-forwarded-host')?.split(',')[0].trim() ||
  c.req.header('host') ||
  new URL(c.req.url).host

// Covers every write (JSON and DELETE too), which is why hono's csrf(), whose
// check is scheme-strict and form-only, is not used. Browsers always send
// Origin on cross-origin writes; Sec-Fetch-Site covers requests without it.
const sameOriginOnly = createMiddleware((c, next) => {
  if (SAFE_METHODS.includes(c.req.method) || AUTH_PATH.test(c.req.path)) {
    return next()
  }
  const origin = c.req.header('origin')
  if (origin !== undefined) {
    if (originHost(origin) !== requestHost(c)) {
      throw new HttpError(403, 'Forbidden')
    }
  } else {
    const site = c.req.header('sec-fetch-site')
    if (site !== undefined && site !== 'same-origin' && site !== 'none') {
      throw new HttpError(403, 'Forbidden')
    }
  }
  return next()
})

// Paths carry no `/api` prefix; createApp mounts this with `route('/api')`.
// Keep it one chain so `ApiType` captures every route for hc<ApiType>.
export const createApiRoutes = (platform: Platform) =>
  new Hono()
    .onError((error, c) => {
      if (error instanceof HttpError) {
        return c.json({ error: error.message }, error.status)
      }
      // hono's own errors (body limit, csrf, ...) carry a ready response.
      if ('getResponse' in error && typeof error.getResponse === 'function') {
        return error.getResponse()
      }
      console.error('unhandled api error', error)
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    .use('*', sameOriginOnly)
    .get('/self-status', async (c) =>
      c.json({ status: await getSelfStatus(c.req.raw.headers) }),
    )
    .post('/search', zValidator('json', searchBodySchema), async (c) => {
      const uid = await getUid(c.req.raw.headers)
      return c.json(await search(c.req.valid('json'), uid, platform.cache(c)))
    })
    .get('/items/:id', zValidator('param', idParam), async (c) => {
      const uid = await getUid(c.req.raw.headers)
      const current = await getItem(c.req.valid('param').id, uid)
      if (current === undefined) {
        throw new HttpError(404, 'Not Found')
      }
      return c.json({ current })
    })
    .post('/items', bodyLimit({ maxSize: MAX_BODY_SIZE }), async (c) => {
      const uid = await getUid(c.req.raw.headers)
      const formData = await c.req.raw.formData().catch(() => {
        throw new HttpError(400, 'Invalid form data')
      })
      return c.json(await updateItem(formData, uid, platform.cache(c)))
    })
    .delete('/items/:id', zValidator('param', idParam), async (c) => {
      const uid = await getUid(c.req.raw.headers)
      await deleteItem(c.req.valid('param').id, uid, platform.cache(c))
      return c.json({ deleted: true as const })
    })
    .post('/cities', zValidator('json', cityParamsSchema), async (c) =>
      c.json(await getCities(c.req.valid('json'), platform.cache(c))),
    )
    .get('/users', async (c) => c.json(await getUsers(platform.cache(c))))
    .all('/auth/*', async (c) => {
      const auth = await getAuth()
      return auth.handler(c.req.raw)
    })

export type ApiType = ReturnType<typeof createApiRoutes>
