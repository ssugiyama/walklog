export default {
    serverExternalPackages: ['sequelize'],
    experimental: {
      serverActions: {
        bodySizeLimit: '2mb',
      },
      useCache: true,
      authInterrupts: true,
    },
    output: 'standalone',
  };