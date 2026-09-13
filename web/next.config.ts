const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
    // Server Actions default to a 1MB body limit, well under the 2MB image
    // cap validated in updateItemAction (lib/actions/walk-actions.ts). Any
    // upload between those sizes hit Next's internal limit first: on
    // Cloudflare Workers (@opennextjs/cloudflare's Node-compat stream
    // shims), the resulting mid-pipeline error isn't handled cleanly and
    // surfaces as a raw internal stream crash instead of our own
    // "Image size must be 2MB or less" validation error. Set well above
    // the 2MB cap (plus form fields) so that check is what actually fires.
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  output: 'standalone',
}

export default nextConfig
