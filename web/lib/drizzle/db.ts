import { getCloudflareContext } from '@opennextjs/cloudflare'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import str2bool from '@/lib/utils/str2bool'
import { relations } from './relations'
import ssl from './ssl'

const createNodeDb = () =>
  drizzle({
    client: postgres(process.env.DB_URL, { ssl }),
    relations,
  })

type Db = ReturnType<typeof createNodeDb>

let nodeDb: Db | null = null

// Hyperdrive terminates the real TLS connection to the origin database
// itself and hands the Worker a plain local connection, so no ssl option is
// needed for this hop (and postgres.js's ssl modes hit multiple different
// options unsupported by Workers' TLS implementation - rejectUnauthorized,
// ALPNProtocols - when tried directly against Supabase without Hyperdrive).
const createWorkerDb = async (): Promise<Db> => {
  const { env } = await getCloudflareContext({ async: true })
  // Not typed against the ambient CloudflareEnv global: that's only merged
  // in by `wrangler types`/`pnpm run cf-typegen`, whose output is gitignored
  // (regenerated per-deployer, and depends on HYPERDRIVE_ID being set) - CI
  // never has it.
  const { connectionString } = (
    env as unknown as { HYPERDRIVE: { connectionString: string } }
  ).HYPERDRIVE
  return drizzle({
    client: postgres(connectionString, { prepare: false, max: 1 }),
    relations,
  })
}

// Cloudflare Workers forbids reusing a TCP socket (and therefore a DB client
// built on one) across requests, so a fresh client must be created per call
// there. On Node/Docker there's no such restriction, so a singleton is kept
// to avoid reconnecting on every request.
export const getDb = (): Promise<Db> => {
  if (str2bool(process.env.CF_WORKERS)) {
    return createWorkerDb()
  }
  nodeDb ??= createNodeDb()
  return Promise.resolve(nodeDb)
}
