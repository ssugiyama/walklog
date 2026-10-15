# Firebase Auth → Better Auth 移行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Auth を廃止し、Better Auth で Google ログインを直接行う(既存ユーザーの walks は引き継ぐ)。

**Architecture:** 既存の `users` テーブルを Better Auth の user テーブルとして使う(Drizzle の TS キーで `id`/`name`/`image` にマップ、DB 列名は不変)。セッションは Postgres + cookie。サーバーは `getAuth()`(Workers ではリクエストごと、Node では singleton)で `auth.api.getSession` を呼ぶ。クライアントは `better-auth/react` の `useSession` から `currentUser` を導出する。

**Tech Stack:** better-auth, drizzle-orm 1.0.0-rc.4 + postgres.js, Next.js 16 (Cache Components) / vinext (Workers), Vite+ (`vp`), vitest + pglite。

**Spec:** `docs/superpowers/specs/2026-10-15-better-auth-migration-design.md`

## Global Constraints

- コマンドは `vp` を使う(`vp add`/`vp remove`/`vp exec`/`vp check`/`vp test`)。`pnpm`/`npx` を直接使わない。
- Next.js 16 は破壊的変更あり。route handler / `connection()` / `headers()` に触る前に `node_modules/next/dist/docs/` の該当ガイドを読む。
- `null`/`undefined` の規約(AGENTS.md): 未設定は `undefined`、明示的な「空」だけ `null`。`useSession` / Better Auth API が返す `null` はライブラリ規約に従う。
- `walks.uid` と `users` の DB 列名(`uid`/`display_name`/`photo_url`)は変更しない。`bin/manage-users.js` は変更しない。
- `AUTO_APPROVE_USERS` の判定は既存どおり `!!process.env.AUTO_APPROVE_USERS`(文字列 `"false"` も真になる既存挙動を変えない)。
- 追加 env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`。いずれも `NEXT_PUBLIC_` ではない(ビルド時に埋め込まない)。
- Drizzle アダプターが `drizzle-orm@1.0.0-rc.4` で動かない場合は Task 1 で止めてユーザーに報告する。別アダプターへ独断で切り替えない。
- 秘密情報(`admin.json` の鍵、`.env`、Firebase export)の中身を出力・コミットしない。

## Review Focus

- `AUTO_APPROVE_USERS` 未設定で新規ユーザーが作られたとき `active=false`(= pending)になり、投稿系アクションが `unauthorized` になること(Task 2, 3)。
- セッションなし(cookie なし / 不正 cookie)で `getUid` が `null`、`getSelfStatusAction` が `'anonymous'` になり、例外で落ちないこと(Task 3)。
- `getSession` 自体が例外を投げても、検索・詳細取得が匿名扱いで動き続けること(Task 3)。
- Workers ではリクエストごとに別の auth インスタンス(別 DB クライアント)を使い、Node では使い回すこと(Task 2)。
- セッション解決前(`currentUser === undefined`)に `searchAction`/`getItemAction` を二重発火しないこと(Task 4)。
- 既存ユーザーが Google 初回ログインで同じ `users.uid` に紐付き、walks が見えること(Task 6、手動確認)。

---

### Task 1: 依存追加・スキーマ・マイグレーション

**Files:**
- Modify: `package.json`(`vp add better-auth` が更新)
- Modify: `lib/drizzle/schema.ts`(`users` を更新、`session`/`account`/`verification` を追加)
- Create: `lib/drizzle/migrations/<timestamp>_better_auth/`(`drizzle-kit generate` が生成)
- Test: `lib/drizzle/schema.test.ts`

**Interfaces:**
- Produces: `users`(TS キー `id`/`email`/`name`/`image`/`emailVerified`/`active`/`createdAt`/`updatedAt`)、`session`、`account`、`verification` を `lib/drizzle/schema.ts` から export。

- [ ] **Step 1: better-auth を追加し、ドキュメントとアダプター互換を確認する**

Run: `vp add better-auth`

その後、インストールされたドキュメント/型で次を確認する(以降のコードはこの API を前提にしている。違いがあれば以降のタスクのコードを実際の API に合わせる):
- `better-auth` の `betterAuth`, `better-auth/adapters/drizzle` の `drizzleAdapter`, `better-auth/react` の `createAuthClient`, `better-auth/next-js` の `toNextJsHandler`
- `user.modelName` / `user.fields` / `user.additionalFields` / `databaseHooks.user.create.before` / `socialProviders.google` / `auth.$context.internalAdapter.createUser`

Run: `ls node_modules/better-auth/dist | head` と `node_modules/better-auth` 内の docs/README を確認。

- [ ] **Step 2: スキーマを書く(失敗するテストを先に書く)**

Create `lib/drizzle/schema.test.ts`:

```ts
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
    const raw = await db.$client.query(
      `SELECT uid, display_name, photo_url FROM users WHERE uid = 'u1'`,
    )
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
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `vp test run lib/drizzle/schema.test.ts`
Expected: FAIL(`users.id` / `session` などが未定義)

- [ ] **Step 4: スキーマを実装する**

`lib/drizzle/schema.ts` の `users` を次に置き換える(import に `text` がなければ追加する):

```ts
export const users = pgTable('users', {
  // TS keys follow better-auth's default field names; the physical column
  // names are unchanged so existing data and bin/manage-users.js keep working.
  id: varchar('uid', { length: 255 }).primaryKey(),
  email: varchar({ length: 255 }),
  name: varchar('display_name', { length: 255 }),
  image: varchar('photo_url', { length: 512 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  active: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)
```

`users.uid` / `users.displayName` / `users.photoURL` を参照している既存コードは Task 3 で直す(この時点では `vp check` の型エラーが出てよい)。

- [ ] **Step 5: マイグレーションを生成する**

Run: `DB_URL=postgres://u:p@localhost:5432/walklog vp exec drizzle-kit generate --name better_auth`
(`drizzle.config.ts` が `DB_URL` を URL として読むためダミー値で足りる。`generate` は DB に接続しない)

生成された SQL を読み、次だけを含むことを確認する: `users` への `email_verified` / `updated_at` 追加、`session`/`account`/`verification` の `CREATE TABLE`、インデックス。`users` の既存列の DROP/RENAME が含まれていたら、スキーマを直して生成し直す。

- [ ] **Step 6: テストが通ることを確認する**

Run: `vp test run lib/drizzle/schema.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml lib/drizzle
git commit -m "feat(auth): add better-auth schema and migration"
```

---

### Task 2: `lib/auth.ts`(サーバー設定)と route handler

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...all]/route.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Consumes: `getDb(): Promise<Db>`(`lib/drizzle/db.ts`)、`users`/`session`/`account`/`verification`(Task 1)。
- Produces: `getAuth(): Promise<Auth>`(`Auth = Awaited<ReturnType<typeof createAuth>>`)。`auth.api.getSession({ headers })` は `{ user: { id, name, email, image, active }, session } | null` を返す。

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/auth.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { users } from './drizzle/schema'

vi.mock('./drizzle/db', async () => {
  const { createTestDb } = await import('./drizzle/test-db')
  const db = await createTestDb()
  return { getDb: vi.fn(async () => db) }
})

import { getDb } from './drizzle/db'
import { getAuth } from './auth'

const createUser = async (email: string) => {
  const auth = await getAuth()
  const ctx = await auth.$context
  return ctx.internalAdapter.createUser({
    email,
    name: 'Test',
    image: 'https://example.com/p.png',
    emailVerified: true,
  })
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
```

- [ ] **Step 2: 失敗を確認する**

Run: `vp test run lib/auth.test.ts`
Expected: FAIL(`./auth` が存在しない)

- [ ] **Step 3: `lib/auth.ts` を実装する**

```ts
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
          before: async (user) => ({
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
```

注意: `user.fields`(`name`/`image` → `displayName`/`photoURL`)は不要。Task 1 で TS キー自体を `name`/`image` にしている。

- [ ] **Step 4: route handler を作る**

Run: `node_modules/next/dist/docs/` の route handler ガイドを読み、`app/api/auth/[...all]/route.ts` の書き方が現行の Next.js 16 に合っているか確認する。

Create `app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from 'better-auth/next-js'
import { getAuth } from '@/lib/auth'

export const GET = async (request: Request) => {
  const auth = await getAuth()
  return toNextJsHandler(auth).GET(request)
}

export const POST = async (request: Request) => {
  const auth = await getAuth()
  return toNextJsHandler(auth).POST(request)
}
```

(`getAuth()` が async のため、`toNextJsHandler(auth)` をモジュール直下で呼べない。)

- [ ] **Step 5: テストが通ることを確認する**

Run: `vp test run lib/auth.test.ts`
Expected: PASS(3 件)

ここで `drizzleAdapter` が `drizzle-orm@1.0.0-rc.4` のインスタンスで失敗する場合(例: `db.query`/relations 関連のエラー)は、**実装を止めて**エラー全文と状況をユーザーに報告する。

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts "app/api/auth"
git commit -m "feat(auth): add better-auth server config and route handler"
```

---

### Task 3: サーバーアクション(`walk-actions.ts`)をセッションベースに

**Files:**
- Modify: `lib/actions/walk-actions.ts`(import、`getOrCreateUser`/`verifyIdToken`/`getUid`/`getSelfStatusAction`/`setIdTokenAction`/`clearIdTokenAction`、各アクションの `idTokenExpired`、`getUsersAction`)
- Modify: `types.ts`(`BaseState.idTokenExpired` を削除、`ConfigT.firebaseConfig` は Task 5)
- Modify: `app/show/[id]/page.tsx:43`(`idTokenExpired: false,` の行を削除)
- Test: `lib/actions/walk-actions.test.ts`

**Interfaces:**
- Consumes: `getAuth()`(Task 2)。
- Produces: `getUid(): Promise<string | null>`(アクティブなユーザーの id、それ以外は `null`)。`getSelfStatusAction(): Promise<SelfStatusT>`。`updateItemAction`/`deleteItemAction`/`searchAction`/`getItemAction` の `_getUid` 注入引数は維持(呼び出し側に引数は渡さなくなる)。`setIdTokenAction`/`clearIdTokenAction` は削除。

- [ ] **Step 1: テストを書き換える(失敗させる)**

`lib/actions/walk-actions.test.ts` で次を行う。

(a) ファイル先頭の `mockIdTokenCookie` から `vi.mock('@/lib/utils/firebase-id-token', …)` までのブロックを次に置き換える:

```ts
let mockSession: { user: { id: string; active: boolean } } | null = null
const mockGetSession = vi.fn(async (_args?: unknown) => mockSession)

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('next/server', () => ({
  connection: vi.fn(async () => {}),
}))

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(async () => ({ api: { getSession: mockGetSession } })),
}))
```

(b) import 部から `clearIdTokenAction`, `setIdTokenAction`, `IdTokenExpiredError`, `verifyFirebaseIdToken` を削除する(`@/lib/utils/firebase-id-token` の import ごと)。

(c) `mockIdTokenCookie = undefined`(旧 135 行付近の `beforeEach`)を `mockSession = null` に置き換え、`mockGetSession.mockClear()` を足す。

(d) `describe('registration gate (getSelfStatusAction / getUid)', …)` ブロックと、続く `describe('setIdTokenAction / clearIdTokenAction', …)` ブロックを、次の 1 つに置き換える:

```ts
  describe('registration gate (getSelfStatusAction / getUid)', () => {
    const post = async () => {
      const formData = new Map()
      formData.set('date', '2023-05-15')
      formData.set('title', 'Test Walk')
      formData.set('path', encode(DEFAULT_PATH))
      return updateItemAction(
        { serial: 0, error: null, id: null },
        formData as unknown as FormData,
      )
    }

    it('getSelfStatusAction returns anonymous when there is no session', async () => {
      mockSession = null

      expect(await getSelfStatusAction()).toBe('anonymous')
    })

    it('getSelfStatusAction returns anonymous instead of throwing when getSession fails', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('db down'))

      expect(await getSelfStatusAction()).toBe('anonymous')
    })

    it('reports pending for a signed-in user who is not active', async () => {
      mockSession = { user: { id: 'testUserId', active: false } }

      expect(await getSelfStatusAction()).toBe('pending')
    })

    it('reports active for an active user', async () => {
      mockSession = { user: { id: 'testUserId', active: true } }

      expect(await getSelfStatusAction()).toBe('active')
    })

    it('denies posting without a session', async () => {
      mockSession = null

      await expect(post()).rejects.toThrow('unauthorized')
    })

    it('denies posting for a pending user', async () => {
      mockSession = { user: { id: 'testUserId', active: false } }

      await expect(post()).rejects.toThrow('unauthorized')
    })

    it('allows posting for an active user', async () => {
      mockSession = { user: { id: 'testUserId', active: true } }

      const result = await post()

      expect(result.error).toBeNull()
      expect(result.id).toEqual(expect.any(Number))
    })
  })
```

(e) 残りの `idTokenExpired: false` のキー(`prevState`/state リテラル、約 275, 460, 552, 942 行付近)を削除し、`expect(result.idTokenExpired).toBe(false)` の行(約 309, 477 行付近)を削除する。テスト名 `'should increment the serial number and reset error/idTokenExpired'` は `'should increment the serial number and reset error'` に直す。

- [ ] **Step 2: 失敗を確認する**

Run: `vp test run lib/actions/walk-actions.test.ts`
Expected: FAIL(`walk-actions.ts` がまだ Firebase を import している / `mockGetSession` が呼ばれない)

- [ ] **Step 3: `walk-actions.ts` を実装する**

import: `cookies` と `@/lib/utils/firebase-id-token` の import を削除し、次を追加する:

```ts
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { getAuth } from '@/lib/auth'
```

`autoApproveUsers` 定数、`UserRow` 型、`getOrCreateUser`、`verifyIdToken` を削除し、`getUid` から `setIdTokenAction`/`clearIdTokenAction` までを次に置き換える(`getUid` の直前のコメントブロック「Verified inert…」は残す):

```ts
// Both `getSession` and `headers()` read request-scoped data, which Cache
// Components forbids while prerendering. With partialPrefetching a page can
// be prerendered with cookies available (e.g. /show/[id]'s generateMetadata
// -> getItemAction -> getUid), so reaching here doesn't imply request time:
// defer explicitly. A failing session lookup is treated as anonymous so
// search and item fetching keep working.
const getSessionUser = async () => {
  await connection()
  try {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user ?? undefined
  } catch (error) {
    console.error('failed to get session', error)
    return undefined
  }
}

const getUid = async (): Promise<string | null> => {
  const user = await getSessionUser()
  return user?.active ? user.id : null
}

export const getSelfStatusAction = async (): Promise<SelfStatusT> => {
  const user = await getSessionUser()
  if (!user) {
    return 'anonymous'
  }
  return user.active ? 'active' : 'pending'
}
```

各アクションの変更:
- `searchAction` / `getItemAction`: `state.idTokenExpired = false` の行を削除。`_getUid(state)` を `_getUid()` に変える。
- `updateItemAction` / `deleteItemAction`: `const uid = await _getUid()` に変え、直後の `if (state.idTokenExpired) { return state }` を削除する。
- 各アクションの `_getUid: typeof getUid = getUid` の宣言はそのまま。
- `getUsersAction` の `rows.map` を次に変える:

```ts
  return rows.map((user) => ({
    uid: user.id,
    displayName: user.name ?? '',
    photoURL: user.image ?? '',
    active: user.active,
  }))
```

`types.ts` の `BaseState` から `idTokenExpired?: boolean` を削除する。`app/show/[id]/page.tsx` の `generateMetadata` 内の `idTokenExpired: false,` を削除する。

- [ ] **Step 4: テストが通ることを確認する**

Run: `vp test run lib/actions/walk-actions.test.ts`
Expected: PASS。`_getUid` を直接渡している既存テストが `idTokenExpired` を前提にしていたら、そのテストの前提ごと削除する(挙動は削除した機能に属する)。

- [ ] **Step 5: Commit**

```bash
git add lib/actions types.ts "app/show/[id]/page.tsx"
git commit -m "feat(auth): resolve the user from the better-auth session in server actions"
```

---

### Task 4: クライアント(auth-client / user-context / 各コンポーネント)

**Files:**
- Create: `lib/auth-client.ts`
- Modify: `lib/utils/user-context.tsx`
- Modify: `lib/utils/searcher.tsx`, `lib/utils/item-fetcher.tsx`
- Modify: `app/_components/nav-bar.tsx`
- Modify: `app/show/[id]/_components/item-box.tsx`, `app/(editor)/_components/walk-editor.tsx`
- Test: 上記それぞれの `*.test.tsx`

**Interfaces:**
- Consumes: `getSelfStatusAction()`, `getUsersAction()`(Task 3)。
- Produces: `authClient`(`lib/auth-client.ts`)。`useUserContext(): { users: UserT[]; currentUser: CurrentUserT | null | undefined; selfStatus: SelfStatusT }`。`CurrentUserT = { uid: string; displayName: string; photoURL: string }`。`idToken`/`setCurrentUser`/`updateIdToken` は削除。

- [ ] **Step 1: `lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'

// baseURL is omitted: the auth routes are served from the same origin.
export const authClient = createAuthClient()
```

- [ ] **Step 2: `user-context.tsx` を書き換える**

```tsx
'use client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSelfStatusAction, getUsersAction } from '@/lib/actions/walk-actions'
import { authClient } from '@/lib/auth-client'
import { SelfStatusT, UserT } from '@/types'

export type CurrentUserT = {
  uid: string
  displayName: string
  photoURL: string
}

type UserContextT = {
  users: UserT[]
  // `undefined`: the session hasn't resolved yet; `null`: resolved, signed
  // out. Consumers like Searcher/ItemFetcher use the difference to wait for
  // the first resolution instead of firing once anonymously and again once
  // the real state arrives.
  currentUser: CurrentUserT | null | undefined
  selfStatus: SelfStatusT
}
const initialState: UserContextT = {
  users: [],
  currentUser: undefined,
  selfStatus: 'anonymous',
}
const UserContext = createContext(initialState)

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data, isPending } = authClient.useSession()
  const sessionUser = data?.user
  const currentUser = useMemo<CurrentUserT | null | undefined>(() => {
    if (isPending) return undefined
    if (!sessionUser) return null
    return {
      uid: sessionUser.id,
      displayName: sessionUser.name,
      photoURL: sessionUser.image ?? '',
    }
  }, [isPending, sessionUser?.id, sessionUser?.name, sessionUser?.image])
  const [users, setUsers] = useState<UserT[]>([])
  const [selfStatus, setSelfStatus] = useState<SelfStatusT>('anonymous')

  useEffect(() => {
    void (async () => {
      setUsers(await getUsersAction())
    })()
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setSelfStatus('anonymous')
      return
    }
    void (async () => {
      setSelfStatus(await getSelfStatusAction())
    })()
  }, [currentUser?.uid])

  return (
    <UserContext.Provider value={{ users, currentUser, selfStatus }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  return useContext(UserContext)
}
```

- [ ] **Step 3: `searcher.tsx` / `item-fetcher.tsx` のテストを先に更新する(失敗させる)**

`lib/utils/searcher.test.tsx` と `lib/utils/item-fetcher.test.tsx` で、`useUserContext` の mock 値を機械的に置き換える:
- `updateIdToken: vi.fn(),` の行を削除する。
- `idToken: 'token-1'` / `idToken: 'real-token-1'` → `currentUser: { uid: 'u1' }`
- `idToken: undefined, // auth state not yet resolved` → `currentUser: undefined, // session not yet resolved`
- `idToken: null` → `currentUser: null`
- コメントの「Firebase's onIdTokenChanged」「idToken」を「the session」「currentUser」に直す。

Run: `vp test run lib/utils/searcher.test.tsx lib/utils/item-fetcher.test.tsx`
Expected: FAIL(コンポーネントがまだ `idToken` を見ている)

- [ ] **Step 4: `searcher.tsx` / `item-fetcher.tsx` を実装する**

`searcher.tsx`:
- `const { updateIdToken, idToken } = useUserContext()` → `const { currentUser } = useUserContext()`
- `initialSearchState` の `idTokenExpired: false,` を削除。
- 最初の effect: コメントを次に置き換え、判定と依存配列を変える。

```tsx
    // currentUser is `undefined` until the session resolves for the first
    // time (see user-context.tsx). Dispatching before that means an
    // already-logged-in user gets one anonymous-looking search followed by a
    // second, authenticated one once the session arrives. Waiting for it to
    // resolve collapses that back down to one dispatch.
    if (currentUser === undefined) {
      return
    }
```
依存配列: `[searchParams, currentUser?.uid]`

- 2 つ目の effect の `if (searchState.idTokenExpired) { startTransition(...); return }` ブロックを削除する。

`item-fetcher.tsx`:
- `initialGetItemState` から `idTokenExpired: false,` を削除。
- `const { updateIdToken, idToken } = useUserContext()` → `const { currentUser } = useUserContext()`
- 最初の effect: 同様に `if (currentUser === undefined) { return }`(コメントも同趣旨に)、依存配列 `[id, currentUser?.uid]`。
- 2 つ目の effect の `idTokenExpired` ブロックを削除する。

Run: `vp test run lib/utils/searcher.test.tsx lib/utils/item-fetcher.test.tsx`
Expected: PASS

- [ ] **Step 5: `nav-bar` のテストを書き換える(失敗させる)**

`app/_components/nav-bar.test.tsx`:
- `import { onIdTokenChanged } from 'firebase/auth'`、`vi.mock('firebase/auth', …)`、`vi.mock('firebase/app', …)` を削除する。
- 次を追加する:

```tsx
const mockSignInSocial = vi.fn()
const mockSignOut = vi.fn()
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: { social: (...args: unknown[]) => mockSignInSocial(...args) },
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}))
```
- `mockSetCurrentUser`, `mockUpdateIdToken`, `(onIdTokenChanged as Mock).mockReturnValue(vi.fn())`、`useConfig` の mock と `useConfig` import を削除する。`useUserContext` の mock 値は `{ currentUser: null, selfStatus: 'anonymous' }` 形に変える(ログイン済みケースは `currentUser: { displayName: 'Test User', photoURL: 'test-url' }`)。
- 最後のテスト `'syncs currentUser and the id token cookie…'` を次の 3 つに置き換える:

```tsx
  it('starts Google sign-in when "login with Google" is clicked', async () => {
    mockSignInSocial.mockResolvedValue({ error: null })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('login with Google'))
    await waitFor(() =>
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/',
      }),
    )
  })

  it('shows the error in a snackbar when sign-in fails', async () => {
    mockSignInSocial.mockResolvedValue({ error: { message: 'boom' } })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('login with Google'))
    await waitFor(() =>
      expect(mockDispatchMain).toHaveBeenCalledWith({
        type: 'OPEN_SNACKBAR',
        payload: 'boom',
      }),
    )
  })

  it('signs out when "logout" is clicked', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: { displayName: 'Test User', photoURL: 'test-url' },
      selfStatus: 'active',
    })
    mockSignOut.mockResolvedValue({ error: null })
    render(<NavBar />)
    fireEvent.click(screen.getByTestId('account-button'))
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
  })
```
(`waitFor` を `@testing-library/react` の import に追加する。)

Run: `vp test run app/_components/nav-bar.test.tsx`
Expected: FAIL

- [ ] **Step 6: `nav-bar.tsx` を実装する**

- Firebase の import(`initializeApp`、`firebase/auth`)と `useConfig` の import、`provider` の `useRef`、`useEffect`(`initializeApp` ブロック)を削除する。`useRef`/`useEffect` が他で未使用なら React の import からも外す。
- `import { authClient } from '@/lib/auth-client'` を追加する。
- `const { currentUser, setCurrentUser, selfStatus, updateIdToken } = useUserContext()` → `const { currentUser, selfStatus } = useUserContext()`
- `handleLogin` / `handleLogout` を次に置き換える:

```tsx
  const handleLogin = useCallback(async (_ev: React.MouseEvent<HTMLLIElement>) => {
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
    if (error) {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    }
  }, [])
  const handleLogout = useCallback(async (_ev: React.MouseEvent<HTMLLIElement>) => {
    const { error } = await authClient.signOut()
    if (error) {
      dispatchMain({ type: 'OPEN_SNACKBAR', payload: error.message })
    }
  }, [])
```
(`callbackURL: '/'`: ログイン後はトップに戻る。現在の検索パラメータを保持したい場合は `window.location.href` を渡す形に変えてよいが、ここでは単純化する。)

Run: `vp test run app/_components/nav-bar.test.tsx`
Expected: PASS

- [ ] **Step 7: `item-box` / `walk-editor` のテストを更新する(失敗させる)**

`app/show/[id]/_components/item-box.test.tsx`: `updateIdToken: mockUpdateIdToken` の行と `mockUpdateIdToken` の宣言を削除し、`idTokenExpired: true` の再試行テスト(約 190〜235 行、「expired token → updateIdToken → 再 dispatch → Activity の hide/show で再実行されない」)を、通常の削除フローの回帰テストに置き換える:

```tsx
  it('does not delete again when the route is hidden and re-shown by Activity', async () => {
    window.confirm = vi.fn(() => true)
    ;(useData as Mock).mockReturnValue([
      {
        current: { id: 'item1', uid: 'user1', length: 9.9 },
        isPending: false,
        error: null,
      },
    ])
    ;(useUserContext as Mock).mockReturnValue({
      users: [
        { uid: 'user1', displayName: 'Test User', photoURL: 'test-photo.jpg' },
      ],
      currentUser: { uid: 'user1' },
    })
    ;(deleteItemAction as Mock).mockResolvedValue({
      serial: 1,
      deleted: true,
    })

    const { rerender } = render(
      <Activity mode="visible">
        <ItemBox />
      </Activity>,
    )
    fireEvent.click(screen.getByTestId('delete-button'))
    await waitFor(() => expect(deleteItemAction).toHaveBeenCalledTimes(1))

    rerender(
      <Activity mode="hidden">
        <ItemBox />
      </Activity>,
    )
    rerender(
      <Activity mode="visible">
        <ItemBox />
      </Activity>,
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(deleteItemAction).toHaveBeenCalledTimes(1)
  })
```
(既存テストの `window.confirm` の扱いに合わせる。元のテスト末尾の assertion を読み、同じ `Activity` 再表示後の回数検証を維持する。)

`app/(editor)/_components/walk-editor.test.tsx`: `mockUpdateIdToken` の宣言(9 行)と mock 内の `updateIdToken: mockUpdateIdToken,`(39 行)を削除する。`idTokenExpired` を扱うテストがあれば削除する。

Run: `vp test run "app/show/[id]/_components/item-box.test.tsx" "app/(editor)/_components/walk-editor.test.tsx"`
Expected: FAIL(コンポーネントが `updateIdToken` を呼ぶ)

- [ ] **Step 8: `item-box.tsx` / `walk-editor.tsx` を実装する**

`item-box.tsx`:
- `initialDeleteState` から `idTokenExpired: false,` を削除。
- `const { updateIdToken } = useUserContext()` を削除。
- `handledDeleteSerialRef` の宣言と、それを使う `useEffect`(コメント「Next.js Cache Components は…」を含む、`deleteState.idTokenExpired` を扱うだけの effect)を丸ごと削除する。`vp check` で未使用になった import(`useRef`、`useEffect`)を外す。

`walk-editor.tsx`:
- `initialState` から `idTokenExpired: false,` を削除。
- `const { updateIdToken, currentUser, users } = useUserContext()` → `const { currentUser, users } = useUserContext()`
- redirect effect を次に置き換える:

```tsx
  useEffect(() => {
    if (state.serial > 0 && state.id && redirectedSerialRef.current !== state.serial) {
      redirectedSerialRef.current = state.serial
      // フォーム送信が成功したらdirtyフラグをリセット
      dispatchMain({ type: 'SET_IS_DIRTY', payload: false })

      if (mode === 'update') {
        const index = data.rows.findIndex((row) => row?.id === item.id)
        if (index >= 0) {
          data.rows[index].stale = true
          setData({ rows: data.rows })
        }
      }
      router.push(idToShowUrl(state.id))
    }
  }, [state?.serial])
```
(直前のコメントブロック「Next.js Cache Components は…」は残す。)

Run: `vp test run "app/show/[id]/_components/item-box.test.tsx" "app/(editor)/_components/walk-editor.test.tsx"`
Expected: PASS

- [ ] **Step 9: 全体を確認する**

Run: `vp check` と `vp test`
Expected: `firebase` 関連以外のエラーなし(`firebase` の import は Task 5 で消えるまで `config.tsx` 等に残ってよい)。

- [ ] **Step 10: Commit**

```bash
git add lib app types.ts
git commit -m "feat(auth): sign in with better-auth on the client and drop the id token refresh flow"
```

---

### Task 5: Firebase の撤去と設定・ドキュメントの更新

**Files:**
- Delete: `lib/utils/firebase-id-token.ts`
- Modify: `package.json`(`vp remove firebase` で更新、`jose` が他で未使用なら `vp remove jose`)
- Modify: `lib/utils/config.tsx`、`types.ts`(`firebaseConfig` を削除)
- Modify: `Dockerfile`、`../.github/workflows/publish-docker-image.yml`、`../.github/workflows/deploy-cloudflare-workers.yml`
- Modify: `cloudflare.config.ts`(コメントの `FIREBASE_*` を `BETTER_AUTH_*, GOOGLE_CLIENT_*` に)
- Modify: `README.md`、`../README.md` があれば同様に
- Modify: `.gitignore`

- [ ] **Step 1: 参照が残っていないことを確認しながら削除する**

Run: `grep -rn "firebase-id-token\|firebase/\|firebaseConfig\|FIREBASE" . --include='*.ts' --include='*.tsx' --include='*.json' --include='*.yml' --include='Dockerfile' --exclude-dir=node_modules --exclude-dir=.next -l`

出力に残っている各ファイルを、次の方針で直す:
- `lib/utils/firebase-id-token.ts` を削除。
- `lib/utils/config.tsx` の `firebaseConfig: { … }` ブロックを削除し、`types.ts` の `ConfigT` から `firebaseConfig` を削除。
- `Dockerfile` の `ARG NEXT_PUBLIC_FIREBASE_API_KEY` / `ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` を削除。
- 2 つの workflow の `NEXT_PUBLIC_FIREBASE_*` 行を削除。

Run: `vp remove firebase`。`jose` は `grep -rn "from 'jose'" lib app` で未使用なら `vp remove jose`。

- [ ] **Step 2: 実行時 env を各デプロイ先に反映する**

- Docker: 実行時 env(コンテナの環境変数)に `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を渡す(ビルド引数ではない)。`../docker-compose.yml` に `environment`/`env_file` で渡している箇所があればそこに追記し、`./web/firebase:/var/www/firebase` のボリューム行(Firebase のキー用)が不要なら削除する。
- Workers: `BETTER_AUTH_SECRET` と `GOOGLE_CLIENT_SECRET` は Worker secret、`BETTER_AUTH_URL` と `GOOGLE_CLIENT_ID` は README の既存の手順(`FIREBASE_*` を設定していた箇所)に沿って設定する。`cloudflare.config.ts` のコメントの `FIREBASE_*` を実際の名前に直す。
- GitHub Actions: Workers のデプロイは build 時に認証 env を必要としない。`FIREBASE_API_KEY`(secret)と `FIREBASE_AUTH_DOMAIN`(var)は不要になったので、リポジトリ設定からの削除をユーザーに依頼する(私は GitHub の設定を変更しない)。

- [ ] **Step 3: README を更新する**

`README.md`(`web/README.md` と、ルート直下に Firebase の記述があれば同様)で次を行う:
- 機能一覧の「User authentication via Firebase」→「User authentication via Better Auth (Google)」。
- 前提条件の「Firebase project with authentication enabled」→「Google OAuth client (Google Cloud Console)」。
- 「3. Firebase Configuration」を「3. Google OAuth Configuration」に置き換え、手順を次にする: Google Cloud Console の APIs & Services → Credentials で OAuth クライアント(ウェブアプリケーション)を作成し、承認済みのリダイレクト URI に `<BASE_URL>/api/auth/callback/google`(ローカルは `http://localhost:3000/api/auth/callback/google`)を追加する。
- `.env` の例と環境変数一覧の `FIREBASE_PROJECT_ID` / `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` を `BETTER_AUTH_SECRET`(`openssl rand -base64 32` で生成)、`BETTER_AUTH_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` に置き換える。
- `manage-users.js approve firebase-uid` の例のプレースホルダを `user-id` にする。
- Workers の節(「Firebase Auth and R2 image storage work unchanged」、`NEXT_PUBLIC_FIREBASE_API_KEY` の export 例、secret 対応表の `FIREBASE_*`)を新しい env 名に合わせる。

- [ ] **Step 4: `.gitignore` に秘密ファイルを追加する**

Run: `git check-ignore -v .env` で `.env` を無視しているファイルを特定し、そこに次を追加する:

```
admin.json
firebase-config.json
```

`admin.json` の実ファイルの削除と GCP 側の鍵の失効は、ユーザーが確認してから行う(このタスクでは削除しない)。

- [ ] **Step 5: 検証**

Run: `vp check` と `vp test`
Expected: PASS。`grep -rn "firebase" . -i --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next` が(移行手順のコメントを除いて)空。

Run: `vp run build`(env は `.env` のダミー値でよい。`BETTER_AUTH_*` が未設定でもビルドが通ることを確認する。通らなければ `lib/auth.ts` の env の読み出しを実行時に遅延させる)。

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!admin.json' ':!firebase-config.json'
git commit -m "chore(auth): remove Firebase and document Better Auth setup"
```

(`git add -A` で秘密ファイルを巻き込まないよう除外している。コミット前に `git status` で `admin.json`/`firebase-config.json`/`.env` が含まれていないことを確認する。)

---

### Task 6: データ移行と手動確認(ユーザーと一緒に実施)

**Files:** なし(DB・Google/GCP・Firebase コンソールでの作業。コミットなし)

このタスクは本番 DB と Google/GCP を触るため、**各ステップの実行前にユーザーに確認する**。

- [ ] **Step 1: 新しい Google OAuth クライアントを作成する(ユーザー作業)**

GCP プロジェクト `gentle-keyword-143605` の APIs & Services → Credentials で、ウェブアプリケーションの OAuth クライアント(例: `walklog web`)を新規作成し、承認済みのリダイレクト URI に `<BASE_URL>/api/auth/callback/google` と `http://localhost:3000/api/auth/callback/google` を追加する。クライアント ID/シークレットを `.env`(ローカル)と各デプロイ先の env に設定する。

- [ ] **Step 2: マイグレーションを適用する**

ローカル DB で `vp run migrate` を実行し、`users` に `email_verified`/`updated_at` が追加され、`session`/`account`/`verification` が作られたことを確認する。本番 DB への適用は、ユーザーの確認後に行う。

- [ ] **Step 3: 既存ユーザーの Google sub を取得する(ユーザー作業)**

```bash
firebase auth:export "$TMPDIR/firebase-users.json" --format=json --project gentle-keyword-143605
jq -r '.users[] | select(.email=="<自分のメール>") | [.localId, (.providerUserInfo[] | select(.providerId=="google.com") | .rawId)] | @tsv' "$TMPDIR/firebase-users.json"
```
出力は「Firebase UID(= 既存の `users.uid`)」と「Google sub」の 2 列。確認後、`firebase-users.json`(個人情報を含む)を必ず削除する。

- [ ] **Step 4: `account` 行を投入する**

```sql
INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
VALUES (gen_random_uuid()::text, '<GOOGLE_SUB>', 'google', '<FIREBASE_UID>', now(), now());
UPDATE users SET email_verified = true WHERE uid = '<FIREBASE_UID>';
```
(`<FIREBASE_UID>` は `users.uid` と一致していることを `SELECT uid, email, active FROM users;` で確認してから実行する。)

- [ ] **Step 5: 手動確認(ローカル、`vp dev`)**

1. 未ログインでトップが表示され、検索が 1 回だけ実行される。
2. 「login with Google」→ Google 認証 → トップに戻り、アカウントメニューに自分の名前が出る。
3. 自分の既存 walk の詳細に edit/delete ボタンが出る(= 既存 `uid` に紐付いた)。
4. 新規 walk を作成・編集・削除できる。
5. logout 後、edit/delete ボタンが消え、`/new` は unauthorized になる。
6. `AUTO_APPROVE_USERS` 未設定で別の Google アカウントでログインすると「pending approval...」になり、`bin/manage-users.js list-pending` に出る(確認後、その行を削除する)。
7. ログイン中にページを再読み込みしても、検索・詳細取得が二重に実行されない(ネットワークタブ)。

- [ ] **Step 6: 本番反映後の後片付け(ユーザー確認の上で)**

- GitHub のリポジトリ設定から `FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN` を削除する。
- GCP で旧サービスアカウント鍵(key id `d63d6e49…`)を失効する(未実施なら)。
- ローカルの `web/admin.json` と `web/firebase-config.json` を削除する。
- Firebase プロジェクトの Authentication を無効化または削除するか決める。
