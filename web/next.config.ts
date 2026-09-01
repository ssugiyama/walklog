const nextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    authInterrupts: true,
  },
  output: 'standalone',
}

export default nextConfig
