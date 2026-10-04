const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
    // Server Actions default to a 1MB body limit, well under the 2MB image
    // cap validated in updateItemAction (lib/actions/walk-actions.ts). Any
    // upload between those sizes hit the framework's internal limit first,
    // and the resulting mid-pipeline error isn't handled cleanly - it
    // surfaced as a raw internal stream crash instead of our own
    // "Image size must be 2MB or less" validation error. Set well above
    // the 2MB cap (plus form fields) so that check is what actually fires.
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  // Standalone output is for the Docker image (`next build`). The
  // Cloudflare build (`vp run cf-build`) sets CF_WORKERS_BUILD to skip it:
  // vinext's standalone step expects the dist/client + dist/server layout,
  // which @cloudflare/vite-plugin 2's Build Output (.cloudflare/output)
  // no longer produces.
  output: process.env.CF_WORKERS_BUILD ? undefined : 'standalone',
}

export default nextConfig
