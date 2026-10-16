import { eq } from 'drizzle-orm'
import { users } from './drizzle/schema'

vi.mock('./drizzle/db', async () => {
  const { createTestDb } = await import('./drizzle/test-db')
  const db = await createTestDb()
  return { getDb: vi.fn(async () => db) }
})

import { getAuth } from './auth'
import { getDb } from './drizzle/db'

const createUser = async (email: string) => {
  const auth = await getAuth()
  const ctx = await auth.$context
  return ctx.internalAdapter.createUser(
    {
      email,
      name: 'Test',
      image: 'https://example.com/p.png',
      emailVerified: true,
    },
    { method: 'oauth', oauth: { providerId: 'google' } },
  )
}

describe('getAuth', () => {
  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret-1')
    vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000')
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret')
    vi.stubEnv('CF_WORKERS', '')
    vi.stubEnv('AUTO_APPROVE_USERS', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('creates new users as pending (active=false) by default', async () => {
    const user = await createUser('pending@example.com')
    const db = await getDb()
    const [row] = await db.select().from(users).where(eq(users.id, user.id))
    expect(row.active).toBe(false)
    expect(row.name).toBe('Test')
    expect(row.image).toBe('https://example.com/p.png')
  })

  it('creates new users as active when AUTO_APPROVE_USERS is set', async () => {
    vi.stubEnv('AUTO_APPROVE_USERS', '1')
    const user = await createUser('active@example.com')
    const db = await getDb()
    const [row] = await db.select().from(users).where(eq(users.id, user.id))
    expect(row.active).toBe(true)
  })

  it('reuses one instance on Node but builds a new one per call on Workers', async () => {
    expect(await getAuth()).toBe(await getAuth())
    vi.stubEnv('CF_WORKERS', 'true')
    expect(await getAuth()).not.toBe(await getAuth())
  })
})
