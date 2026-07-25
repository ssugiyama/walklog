import str2bool from '@/lib/utils/str2bool'
export default str2bool(process.env.DB_SSL)
  ? {
      rejectUnauthorized: str2bool(process.env.DB_SSL_REJECT_UNAUTHORIZED),
      ca: process.env.DB_SSL_CA
        ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf-8')
        : undefined,
      key: process.env.DB_SSL_KEY
        ? Buffer.from(process.env.DB_SSL_KEY, 'base64').toString('utf-8')
        : undefined,
      cert: process.env.DB_SSL_CERT
        ? Buffer.from(process.env.DB_SSL_CERT, 'base64').toString('utf-8')
        : undefined,
    }
  : undefined
