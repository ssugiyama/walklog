import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { PGlite } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { relations } from './relations'

export async function createTestDb() {
  const client = new PGlite({ extensions: { postgis } })
  await client.exec('CREATE EXTENSION IF NOT EXISTS postgis;')
  const db = drizzlePglite({ client, relations })
  await migrate(db, { migrationsFolder: './lib/drizzle/migrations' })
  return { db, client }
}
