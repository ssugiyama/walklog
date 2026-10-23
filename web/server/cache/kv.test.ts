import { cached } from './types'
import { kvCache, type KVNamespace } from './kv'

const createFakeKv = () => {
  const store = new Map<string, string>()
  const put = vi.fn(
    async (key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value)
    },
  )
  const kv: KVNamespace = {
    get: async (key: string) => store.get(key) ?? null,
    put,
  }
  return { kv, put, store }
}

describe('kvCache + cached', () => {
  it('does not call fn on the second call', async () => {
    const { kv } = createFakeKv()
    const cache = kvCache(kv)
    const fn = vi.fn(async () => ({ n: 1 }))
    const opts = { key: 'k', ttlSeconds: 120 }
    expect(await cached(cache, opts, fn)).toEqual({ n: 1 })
    expect(await cached(cache, opts, fn)).toEqual({ n: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('recomputes after bumpTag', async () => {
    const { kv, store } = createFakeKv()
    const cache = kvCache(kv)
    const fn = vi.fn(async () => 'v')
    const opts = { key: 'k', tags: ['search'], ttlSeconds: 120 }
    await cached(cache, opts, fn)
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(1)
    await cache.bumpTag('search')
    expect(store.has('tag:search')).toBe(true)
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('never uses an expirationTtl below 60 seconds', async () => {
    const { kv, put } = createFakeKv()
    const cache = kvCache(kv)
    await cache.set('k', 'v', 5)
    await cache.set('k2', 'v', 300)
    expect(put.mock.calls[0][2]).toEqual({ expirationTtl: 60 })
    expect(put.mock.calls[1][2]).toEqual({ expirationTtl: 300 })
  })
})
