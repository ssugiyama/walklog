import { defineConfig } from 'drizzle-kit'

const { hostname, port, pathname, username, password } = new URL(
  process.env.DB_URL,
)

import ssl from './lib/drizzle/ssl'

export default defineConfig({
  dialect: 'postgresql',
  out: './lib/drizzle/migrations',
  schema: './lib/drizzle/schema.ts',
  dbCredentials: {
    host: hostname,
    port: port ? Number(port) : 5432,
    user: username,
    password: password,
    database: pathname.slice(1),
    ssl,
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
})
