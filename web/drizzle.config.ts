import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'postgresql',
  out: './lib/drizzle/migrations',
  schema: './lib/drizzle/schema.ts',
  dbCredentials: {
    url: process.env.DB_URL,
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
})
