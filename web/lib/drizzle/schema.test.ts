import { eq } from 'drizzle-orm'
import { account, session, users, verification } from './schema'
import { createTestDb } from './test-db'

describe('better-auth schema', () => {
  it('maps users to better-auth field names while keeping the legacy columns', async () => {
    const db = await createTestDb()
    await db.insert(users).values({
      id: 'u1',
      email: 'a@example.com',
      name: 'A',
      image: 'https://example.com/a.png',
    })
    const [row] = await db.select().from(users).where(eq(users.id, 'u1'))
    expect(row).toMatchObject({
      id: 'u1',
      name: 'A',
      image: 'https://example.com/a.png',
      emailVerified: false,
      active: false,
    })
    expect(row.createdAt).toBeInstanceOf(Date)
    expect(row.updatedAt).toBeInstanceOf(Date)

    // The physical column names must not change (bin/manage-users.js uses them).
    const raw = await (
      db.$client as { query: (sql: string) => Promise<{ rows: unknown[] }> }
    ).query(`SELECT uid, display_name, photo_url FROM users WHERE uid = 'u1'`)
    expect(raw.rows[0]).toEqual({
      uid: 'u1',
      display_name: 'A',
      photo_url: 'https://example.com/a.png',
    })
  })

  it('creates session/account/verification tables that cascade on user delete', async () => {
    const db = await createTestDb()
    await db.insert(users).values({ id: 'u2' })
    await db.insert(session).values({
      id: 's1',
      token: 't1',
      userId: 'u2',
      expiresAt: new Date(Date.now() + 1000),
    })
    await db.insert(account).values({
      id: 'a1',
      accountId: 'google-sub',
      providerId: 'google',
      userId: 'u2',
    })
    await db.insert(verification).values({
      id: 'v1',
      identifier: 'x',
      value: 'y',
      expiresAt: new Date(Date.now() + 1000),
    })
    await db.delete(users).where(eq(users.id, 'u2'))
    expect(await db.select().from(session)).toEqual([])
    expect(await db.select().from(account)).toEqual([])
  })
})
