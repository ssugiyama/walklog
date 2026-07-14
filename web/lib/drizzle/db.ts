import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { relations } from './relations'

// const options = {
//   ssl: process.env.DB_SSL === 'true' ? {
//     rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
//     ca: process.env.DB_SSL_CA ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf-8') : undefined,
//     key: process.env.DB_SSL_KEY ? Buffer.from(process.env.DB_SSL_KEY, 'base64').toString('utf-8') : undefined,
//     cert: process.env.DB_SSL_CERT ? Buffer.from(process.env.DB_SSL_CERT, 'base64').toString('utf-8') : undefined,
//   } : undefined,
// }

export const client = postgres(process.env.DB_URL)

// { schema } is used for relational queries
export const db = drizzle({ client, relations })
