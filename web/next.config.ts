const nextConfig = {
  cacheComponents: true,
  partialPrefetching: false,
  experimental: {
    authInterrupts: true,
  },
  output: 'standalone',
}

export default nextConfig
