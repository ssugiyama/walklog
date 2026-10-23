import { createApp } from '@/server/app'
import { memoryCache } from '@/server/cache/memory'

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(async () => ({
    api: { getSession: async () => null },
    handler: async () => new Response('auth-ok'),
  })),
}))
vi.mock('../../lib/drizzle/db', () => ({ getDb: async () => ({}) }))
vi.mock('@/server/services/walks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/services/walks')>()),
  getItem: vi.fn(),
}))

import { getItem } from '@/server/services/walks'

const cache = memoryCache()
const app = createApp({
  getTemplate: async () => '<html><head><!--app-head--></head></html>',
  cache: () => cache,
})

describe('page routes', () => {
  beforeEach(() => {
    vi.mocked(getItem).mockReset()
  })

  it('injects walk metadata on /show/:id', async () => {
    vi.mocked(getItem).mockResolvedValue({
      id: 1,
      uid: 'u',
      date: '2026-01-02',
      title: 'T',
      length: 2,
      comment: 'hello',
      image: 'http://img/x.png',
    })
    const res = await app.request('/show/1')
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('2026-01-02 : T (2.0 km)')
    expect(html).toContain('og:image" content="http://img/x.png"')
    expect(html).toContain('og:url" content="/show/1"')
  })

  it('falls back to the default head when missing, invalid or failing', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined)
    for (const path of ['/show/999', '/show/abc']) {
      const res = await app.request(path)
      expect(res.status).toBe(200)
      expect(await res.text()).toContain('<title>Walklog</title>')
    }
    vi.mocked(getItem).mockRejectedValueOnce(new Error('boom'))
    const res = await app.request('/show/2')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<title>Walklog</title>')
  })

  it('uses titles for /new and /edit/:id', async () => {
    expect(await (await app.request('/new')).text()).toContain(
      '<title>new walk | Walklog</title>',
    )
    expect(await (await app.request('/edit/7')).text()).toContain(
      '<title>edit walk : 7 | Walklog</title>',
    )
  })

  it('redirects /walk/:id and 404s a bad id', async () => {
    const res = await app.request('/walk/5')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/show/5')
    expect((await app.request('/walk/x')).status).toBe(404)
  })

  it('serves the manifest with the light theme color', async () => {
    vi.stubEnv('THEME_COLOR_LIGHT', '#abcdef')
    const res = await app.request('/manifest.webmanifest')
    expect((await res.json()).theme_color).toBe('#abcdef')
    vi.unstubAllEnvs()
  })

  it('renders the shell for unknown extension-less paths only', async () => {
    expect((await app.request('/whatever')).status).toBe(200)
    expect((await app.request('/foo.js')).status).toBe(404)
  })
})
