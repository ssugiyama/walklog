import { Hono } from 'hono'
import { memoryCache } from '@/server/cache/memory'
import { HttpError } from '@/server/http-error'
import { createApiRoutes } from './api'

let mockSession: { user: { id: string; active: boolean } } | null = null

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(async () => ({
    api: { getSession: async () => mockSession },
    handler: async () => new Response('auth-ok'),
  })),
}))

// The pending-user test runs the real updateItem, which only needs getDb()
// to resolve before it rejects an anonymous caller.
vi.mock('../../lib/drizzle/db', () => ({ getDb: async () => ({}) }))

vi.mock('@/server/services/walks', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/server/services/walks')>()
  return {
    ...actual,
    getItem: vi.fn(),
    deleteItem: vi.fn(),
    updateItem: vi.fn(actual.updateItem),
  }
})

import { getItem, deleteItem, updateItem } from '@/server/services/walks'

const cache = memoryCache()
const api = createApiRoutes({
  getTemplate: async () => '',
  cache: () => cache,
})
const app = new Hono().route('/api', api)

const ORIGIN = 'http://localhost'
const sameOrigin = { Origin: ORIGIN }

const multipart = (extra: Record<string, string> = {}) => {
  const fd = new FormData()
  fd.set('title', 't')
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  mockSession = null
  vi.mocked(getItem).mockReset()
  vi.mocked(deleteItem).mockReset()
})

describe('GET /api/items/:id', () => {
  it('returns 404 when the walk does not exist', async () => {
    vi.mocked(getItem).mockResolvedValue(undefined)
    const res = await app.request('/api/items/999')
    expect(res.status).toBe(404)
  })

  it('returns current: null for someone else draft', async () => {
    vi.mocked(getItem).mockResolvedValue(null)
    const res = await app.request('/api/items/1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ current: null })
  })

  it('rejects a malformed id', async () => {
    const res = await app.request('/api/items/abc')
    expect(res.status).toBe(400)
  })
})

describe('error mapping', () => {
  it('converts HttpError to its status and an error body', async () => {
    vi.mocked(deleteItem).mockRejectedValue(new HttpError(403, 'nope'))
    const res = await app.request('/api/items/1', {
      method: 'DELETE',
      headers: sameOrigin,
    })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'nope' })
  })

  it('deletes with a same-origin request', async () => {
    vi.mocked(deleteItem).mockResolvedValue(undefined)
    const res = await app.request('/api/items/1', {
      method: 'DELETE',
      headers: sameOrigin,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true })
  })
})

describe('CSRF', () => {
  it('rejects POST /items from a foreign Origin', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
      body: multipart(),
    })
    expect(res.status).toBe(403)
    expect(updateItem).not.toHaveBeenCalled()
  })

  it('rejects DELETE from a foreign Origin', async () => {
    const res = await app.request('/api/items/1', {
      method: 'DELETE',
      headers: { Origin: 'https://evil.example' },
    })
    expect(res.status).toBe(403)
    expect(deleteItem).not.toHaveBeenCalled()
  })

  it('rejects a cross-site request without Origin', async () => {
    const res = await app.request('/api/items/1', {
      method: 'DELETE',
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    })
    expect(res.status).toBe(403)
  })

  it('does not check auth routes', async () => {
    const res = await app.request('/api/auth/sign-in/social', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('auth-ok')
  })
})

describe('POST /api/items', () => {
  it('returns 413 for a body over 3MB', async () => {
    const boundary = 'x'
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="comment"\r\n\r\n${'a'.repeat(3 * 1024 * 1024 + 1)}\r\n--${boundary}--\r\n`
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: {
        ...sameOrigin,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    })
    expect(res.status).toBe(413)
    expect(updateItem).not.toHaveBeenCalled()
  })
})

describe('pending user', () => {
  beforeEach(() => {
    mockSession = { user: { id: 'u1', active: false } }
  })

  it('reports pending from /self-status', async () => {
    const res = await app.request('/api/self-status')
    expect(await res.json()).toEqual({ status: 'pending' })
  })

  it('gets 401 on POST /items', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      headers: sameOrigin,
      body: multipart(),
    })
    expect(res.status).toBe(401)
  })
})
