import { newTagVersion, type AppCache } from './types'

// Minimal structural subset of Cloudflare's KVNamespace.
export interface KVNamespace {
  get(key: string, type: 'text'): Promise<string | null>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>
}

// KV rejects expirationTtl below 60 seconds.
const KV_MIN_TTL_SECONDS = 60

export const kvCache = (kv: KVNamespace): AppCache => ({
  async get<T>(key: string) {
    const text = await kv.get(key, 'text')
    if (text === null) return undefined
    return JSON.parse(text) as T
  },
  async set<T>(key: string, value: T, ttlSeconds: number) {
    await kv.put(key, JSON.stringify(value), {
      expirationTtl: Math.max(KV_MIN_TTL_SECONDS, Math.ceil(ttlSeconds)),
    })
  },
  async getTagVersion(tag: string) {
    return (await kv.get(`tag:${tag}`, 'text')) ?? '0'
  },
  async bumpTag(tag: string) {
    await kv.put(`tag:${tag}`, newTagVersion())
  },
})
