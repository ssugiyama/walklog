export interface AppCache {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  getTagVersion(tag: string): Promise<string>
  bumpTag(tag: string): Promise<void>
}

export type CachedOptions = {
  key: string
  tags?: string[]
  ttlSeconds: number
}

// Values must be JSON-serializable (the KV implementation stores JSON).
// Tags are invalidated by changing their version, which is part of the key.
export const cached = async <T>(
  cache: AppCache,
  opts: CachedOptions,
  fn: () => Promise<T>,
): Promise<T> => {
  const versions = await Promise.all(
    (opts.tags ?? []).map(
      async (tag) => `|${tag}@${await cache.getTagVersion(tag)}`,
    ),
  )
  const fullKey = opts.key + versions.join('')
  const hit = await cache.get<T>(fullKey)
  if (hit !== undefined) return hit
  const value = await fn()
  await cache.set(fullKey, value, opts.ttlSeconds)
  return value
}

export const newTagVersion = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
