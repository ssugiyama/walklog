import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '@/lib/drizzle/db'
import { account, session, users, verification } from '@/lib/drizzle/schema'
import str2bool from '@/lib/utils/str2bool'

const createAuth = async () => {
  const db = await getDb()
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      // `users` is keyed by the model name configured below; the other
      // tables use better-auth's default model names.
      schema: { users, session, account, verification },
    }),
    user: {
      modelName: 'users',
      additionalFields: {
        // Registration gate: new users are pending until approved (see
        // bin/manage-users.js) unless AUTO_APPROVE_USERS is set.
        active: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: (user) =>
            Promise.resolve({
              data: { ...user, active: !!process.env.AUTO_APPROVE_USERS },
            }),
        },
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
  })
}

export type Auth = Awaited<ReturnType<typeof createAuth>>

let nodeAuth: Auth | undefined

// Mirrors getDb() (lib/drizzle/db.ts): Cloudflare Workers forbids reusing a
// DB client (a TCP socket) across requests, and the auth instance holds one,
// so it must be rebuilt per call there. Node keeps a singleton.
export const getAuth = async (): Promise<Auth> => {
  if (str2bool(process.env.CF_WORKERS)) {
    return createAuth()
  }
  nodeAuth ??= await createAuth()
  return nodeAuth
}
