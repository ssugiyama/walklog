import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { relations } from './relations'
import ssl from './ssl'

const options = {
  ssl,
}

const client = postgres(process.env.DB_URL, options)

export const db = drizzle({ client, relations })
