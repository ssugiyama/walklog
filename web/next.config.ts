import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    useCache: true,
    authInterrupts: true,
  },
  output: 'standalone',
}

export default async (phase: string) => {
  // Gives local server code access to local versions of Cloudflare bindings
  // under `next dev`. Gated on the phase rather than left unconditional:
  // @opennextjs/cloudflare's own dev-detection heuristic also fires during
  // `next build` when `useCache` is enabled, which would otherwise pull
  // wrangler/.dev.vars into the Docker build too.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    const { initOpenNextCloudflareForDev } = await import(
      '@opennextjs/cloudflare'
    )
    await initOpenNextCloudflareForDev()
  }
  return nextConfig
}
