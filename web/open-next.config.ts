import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache'

// queue/cachePurge are left as the default "dummy" (no-op): they only matter
// for time-based ISR (`revalidate: N`) background revalidation, which this
// app doesn't use - lib/actions/walk-actions.ts only does on-demand
// `revalidateTag`, which writes straight to the tag cache without going
// through the queue (see revalidateTag in @opennextjs/aws's adapters/cache.ts).
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
})
