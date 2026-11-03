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
// Workers KV rejects longer keys (get/put throw), and search keys embed the
// whole encoded path, so those are replaced by a digest.
const KV_MAX_KEY_BYTES = 512

const encoder = new TextEncoder()

const toKvKey = async (key: string): Promise<string> => {
  const bytes = encoder.encode(key)
  if (bytes.length <= KV_MAX_KEY_BYTES) return key
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, '0'))
  return `sha256:${hex.join('')}`
}

export const kvCache = (kv: KVNamespace): AppCache => ({
  async get<T>(key: string) {
    const text = await kv.get(await toKvKey(key), 'text')
    if (text === null) return undefined
    return JSON.parse(text) as T
  },
  async set<T>(key: string, value: T, ttlSeconds: number) {
    await kv.put(await toKvKey(key), JSON.stringify(value), {
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
