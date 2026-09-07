import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache'

// TEMPORARY: logs timing around every call so a `wrangler tail` capture can
// show whether a hang is inside the R2/D1 cache lookup itself. Remove once
// the intermittent /show/[id] hang is root-caused.
const withTiming = <T extends object>(label: string, target: T): T =>
  new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver)
      if (typeof value !== 'function') return value
      return async (...args: unknown[]) => {
        const start = Date.now()
        console.warn(`[DIAG] ${label}.${String(prop)}: start`, start)
        try {
          return await value.apply(obj, args)
        } finally {
          console.warn(
            `[DIAG] ${label}.${String(prop)}: end`,
            Date.now(),
            'elapsedMs',
            Date.now() - start,
          )
        }
      }
    },
  })

// queue/cachePurge are left as the default "dummy" (no-op): they only matter
// for time-based ISR (`revalidate: N`) background revalidation, which this
// app doesn't use - lib/actions/walk-actions.ts only does on-demand
// `revalidateTag`, which writes straight to the tag cache without going
// through the queue (see revalidateTag in @opennextjs/aws's adapters/cache.ts).
export default defineCloudflareConfig({
  incrementalCache: withTiming('r2Cache', r2IncrementalCache),
  tagCache: withTiming('d1TagCache', d1NextTagCache),
})
