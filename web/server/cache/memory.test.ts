import { cached } from './types'
import { memoryCache } from './memory'

describe('memoryCache + cached', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call fn on the second call', async () => {
    const cache = memoryCache()
    const fn = vi.fn(async () => ({ n: 1 }))
    const opts = { key: 'k', ttlSeconds: 60 }
    expect(await cached(cache, opts, fn)).toEqual({ n: 1 })
    expect(await cached(cache, opts, fn)).toEqual({ n: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('recomputes after bumpTag', async () => {
    const cache = memoryCache()
    const fn = vi.fn(async () => 'v')
    const opts = { key: 'k', tags: ['search'], ttlSeconds: 60 }
    await cached(cache, opts, fn)
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(1)
    await cache.bumpTag('search')
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not invalidate entries with other tags', async () => {
    const cache = memoryCache()
    const fn = vi.fn(async () => 'v')
    const opts = { key: 'k', tags: ['item'], ttlSeconds: 60 }
    await cached(cache, opts, fn)
    await cache.bumpTag('search')
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('recomputes after the TTL elapses', async () => {
    vi.useFakeTimers()
    const cache = memoryCache()
    const fn = vi.fn(async () => 'v')
    const opts = { key: 'k', ttlSeconds: 10 }
    await cached(cache, opts, fn)
    vi.advanceTimersByTime(9_000)
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2_000)
    await cached(cache, opts, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('evicts the oldest key when maxEntries is exceeded', async () => {
    const cache = memoryCache(2)
    await cache.set('a', 1, 60)
    await cache.set('b', 2, 60)
    await cache.set('c', 3, 60)
    expect(await cache.get('a')).toBeUndefined()
    expect(await cache.get('b')).toBe(2)
    expect(await cache.get('c')).toBe(3)
  })

  it('treats a recently read key as most recently used', async () => {
    const cache = memoryCache(2)
    await cache.set('a', 1, 60)
    await cache.set('b', 2, 60)
    await cache.get('a')
    await cache.set('c', 3, 60)
    expect(await cache.get('a')).toBe(1)
    expect(await cache.get('b')).toBeUndefined()
  })
})
