import { Hono, type Context } from 'hono'
import { injectHead, renderHead, type HeadData } from '@/server/head'
import type { Platform } from '@/server/platform'
import { getUid } from '@/server/services/session'
import { getItem } from '@/server/services/walks'
import { idParamSchema } from '@/lib/utils/search-params-schema'
import { idToShowUrl, walkDescription, walkTitle } from '@/lib/utils/meta-utils'
import { resolveThemeColors } from '@/lib/utils/theme-color'

const env = () => process.env as Record<string, string | undefined>

// Any failure falls back to the default head: the SPA still loads and shows
// its own error state.
const showHead = async (rawId: string, headers: Headers): Promise<HeadData> => {
  const parsedId = idParamSchema.safeParse(rawId)
  if (!parsedId.success) {
    return {}
  }
  try {
    const item = await getItem(parsedId.data, await getUid(headers))
    if (!item) {
      return {}
    }
    const title = walkTitle(item)
    return {
      title,
      description: walkDescription(item),
      ogTitle: title,
      ogUrl: idToShowUrl(item.id),
      ogImage: item.image || undefined,
    }
  } catch {
    return {}
  }
}

export const createPageRoutes = (platform: Platform) => {
  const app = new Hono()

  const page = async (c: Context, head: HeadData) => {
    const template = await platform.getTemplate(c)
    return c.html(
      injectHead(template, renderHead(head, env(), new URL(c.req.url).origin)),
    )
  }

  app.get('/manifest.webmanifest', (c) => {
    const { light } = resolveThemeColors(env())
    return c.json(
      {
        name: 'walklog',
        short_name: 'walklog',
        icons: [
          { src: 'icons/icon2.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon1.png', sizes: '512x512', type: 'image/png' },
        ],
        display: 'standalone',
        start_url: '/',
        theme_color: light,
        background_color: light,
      },
      200,
      { 'Content-Type': 'application/manifest+json' },
    )
  })

  app.get('/', (c) => {
    const description = env().SITE_DESCRIPTION || ''
    return page(c, { description, ogTitle: description, ogUrl: '/' })
  })

  app.get('/show/:id', async (c) =>
    page(c, await showHead(c.req.param('id'), c.req.raw.headers)),
  )

  app.get('/new', (c) => page(c, { title: 'new walk' }))

  app.get('/edit/:id', (c) =>
    page(c, { title: `edit walk : ${c.req.param('id')}` }),
  )

  app.get('/walk/:id', (c) => {
    const parsedId = idParamSchema.safeParse(c.req.param('id'))
    if (!parsedId.success) {
      return c.notFound()
    }
    return c.redirect(idToShowUrl(parsedId.data), 302)
  })

  // SPA fallback: any other extension-less path renders the shell and the
  // client router decides what to show.
  app.get('*', (c) => {
    const last = c.req.path.split('/').pop() ?? ''
    if (last.includes('.') || c.req.path.startsWith('/api/')) {
      return c.notFound()
    }
    return page(c, {})
  })

  return app
}
