const nextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  experimental: {
    authInterrupts: true,
    useCache: true,
  },
  output: 'standalone',
}

export default nextConfig
