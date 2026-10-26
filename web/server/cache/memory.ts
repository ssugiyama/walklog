import { newTagVersion, type AppCache } from './types'

type Entry = { value: unknown; expiresAt: number }

export const memoryCache = (maxEntries = 500): AppCache => {
  // Map keeps insertion order, so the first key is the least recently used.
  const store = new Map<string, Entry>()
  const tagVersions = new Map<string, string>()

  return {
    get<T>(key: string) {
      const entry = store.get(key)
      if (!entry) return Promise.resolve(undefined)
      store.delete(key)
      if (entry.expiresAt <= Date.now()) return Promise.resolve(undefined)
      store.set(key, entry)
      return Promise.resolve(entry.value as T)
    },
    set<T>(key: string, value: T, ttlSeconds: number) {
      store.delete(key)
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
      while (store.size > maxEntries) {
        const oldest = store.keys().next()
        if (oldest.done) break
        store.delete(oldest.value)
      }
      return Promise.resolve()
    },
    getTagVersion(tag: string) {
      return Promise.resolve(tagVersions.get(tag) ?? '0')
    },
    bumpTag(tag: string) {
      tagVersions.set(tag, newTagVersion())
      return Promise.resolve()
    },
  }
}
