import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { relations } from './relations'

// const options = {
//   ssl: process.env.DB_SSL === 'true' ? {
//     rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
//     ca: process.env.DB_SSL_CA ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf-8') : undefined,
//     key: process.env.DB_SSL_KEY ? Buffer.from(process.env.DB_SSL_KEY, 'base64').toString('utf-8') : undefined,
//     cert: process.env.DB_SSL_CERT ? Buffer.from(process.env.DB_SSL_CERT, 'base64').toString('utf-8') : undefined,
//   } : undefined,
// }

export async function createTestDb() {
  const client = new PGlite({ extensions: { postgis } });
  await client.exec('CREATE EXTENSION IF NOT EXISTS postgis;')
  const db = drizzlePglite({ client, relations });
  return { db, client };
}


