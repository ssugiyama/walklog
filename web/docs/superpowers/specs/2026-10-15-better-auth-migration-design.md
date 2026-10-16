# Firebase Auth → Better Auth 移行 設計

## 目的

Firebase Auth を完全に廃止し、Better Auth で Google ログインを直接サポートする。認証手段は将来増やせる構成にするが、現状は Google のみ。

## 前提・制約

- 既存ユーザーは開発者 1 人のみ。既存データ(walks)は引き継ぐ。
- 既存の承認フロー(`users.active`、`AUTO_APPROVE_USERS`、`selfStatus` = anonymous/pending/active)は維持する。
- Next.js 16(Cache Components)。cookie/headers を読む処理は prerender 中に走らないよう `connection()` で動的化する(現 `verifyFirebaseIdToken` と同じ方針)。
- 実装前に `node_modules/next/dist/docs/` と Better Auth の最新ドキュメントを確認する(AGENTS.md)。
- `null`/`undefined` の使い分けは AGENTS.md の規約に従う(Better Auth の API が返す `null` は例外として扱う)。

## 方針

既存の `users` テーブルを Better Auth の user テーブルとして使う。`walks.uid` は変更しない。

| Better Auth | users 列 | 備考 |
| --- | --- | --- |
| `id` | `uid` | `modelName`/`fields` でマップ |
| `name` | `display_name` | |
| `image` | `photo_url` | |
| `email` | `email` | |
| `emailVerified` | `email_verified` | 新規列(boolean, not null, default false) |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | 新規列(timestamp, not null, default now) |
| `active`(additionalField) | `active` | `input: false` でクライアントから設定不可 |

Better Auth 標準の `session` / `account` / `verification` テーブルを Drizzle で追加する(`@better-auth/cli generate` の出力を基準にする)。

却下した案: Better Auth 専用 `user` テーブルを別途作る案。`users` と二重管理になり、`walks.uid` の張り替えも要るため。

## コンポーネント

### サーバー

- `lib/auth.ts`: `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), socialProviders: { google }, user: { modelName: 'users', fields, additionalFields: { active } } })`。
- `databaseHooks.user.create.before` で `active` を `AUTO_APPROVE_USERS` から設定(現 `getOrCreateUser` の挙動を置き換える)。
- `app/api/auth/[...all]/route.ts`: `toNextJsHandler(auth)`。
- `lib/actions/walk-actions.ts`:
  - `verifyIdToken` / `getOrCreateUser` / `setIdTokenAction` / `clearIdTokenAction` を削除。
  - `getUid` と `getSelfStatusAction` は `connection()` の後に `auth.api.getSession({ headers: await headers() })` を呼ぶ。`selfStatus` は `session.user.active` から導出。
  - `_getUid` 注入の形は維持し、既存テストの大半を温存する。

### クライアント

- `lib/auth-client.ts`: `createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] })`。
- `app/_components/nav-bar.tsx`: `authClient.signIn.social({ provider: 'google' })`(リダイレクト方式)と `authClient.signOut()`。popup と `onIdTokenChanged` を削除。
- `lib/utils/user-context.tsx`: `authClient.useSession()` ベースに書き換える。`idToken` / `updateIdToken` を削除し、「セッション解決待ち(undefined)」と「サインアウト済み(null)」の区別は維持する(`searcher` / `item-fetcher` が初回の二重リクエストを避けるため)。
- `lib/utils/searcher.tsx`, `lib/utils/item-fetcher.tsx`, `types.ts`: `idTokenExpired` と再取得フローを削除。セッション cookie で期限は Better Auth が管理する。

### 削除

- `firebase` 依存、`lib/utils/firebase-id-token.ts`、`firebaseConfig`(`config.tsx`、`types.ts`)、`NEXT_PUBLIC_FIREBASE_*` / `FIREBASE_PROJECT_ID` env、`admin.json`、`firebase-config.json`。
- `.gitignore` に `admin.json` を追加する(現状は未追跡かつ ignore 対象外。Firebase のサービスアカウント鍵が入っており、GCP 側での鍵の失効はユーザーが行う)。

## 設定

- 追加 env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`。デプロイ先(Docker / Workers)の env にも追加する。
- Google OAuth クライアントは、既存の Firebase 自動作成のもの(「Web client (auto created by Google Service)」)を流用せず、同じ GCP プロジェクト(`gentle-keyword-143605`)に専用クライアント(例: `walklog web`)を新規作成する。Firebase 廃止時の誤削除を避け、用途を明確にするため。OAuth 同意画面は既存のものを使う。
- 新規クライアントの承認済みリダイレクト URI: `<BASE_URL>/api/auth/callback/google` と `http://localhost:3000/api/auth/callback/google`。
- Google の sub はアカウント固有でクライアントに依存しないため、データ移行(下記)には影響しない。

## 拡張性

`account` テーブルは provider ごとに行を持つ。他の social provider やメール認証などは `lib/auth.ts` の設定追加で足せる構成にする。今回は Google 以外を実装しない(YAGNI)。

## データ移行(B: export 方式)

1. `firebase auth:export` で、対象ユーザーの Google `providerUserInfo.rawId`(sub)を取得する。
2. マイグレーション後、SQL で `account` に 1 行入れる(`providerId='google'`, `accountId=<sub>`, `userId=<既存 users.uid>`)。
3. 初回ログイン時に既存 `users` 行(= 既存 `uid`)にセッションが紐付き、walks がそのまま見える。

メールでの自動アカウントリンク(`account.accountLinking`)でも同じ結果になる。ユーザーが 1 人のため、export が不要になる代替として記録しておく。

## エラー処理

- セッションなし: `getUid` は `null`、`selfStatus` は `'anonymous'`(現状と同じ)。
- `getSession` の失敗: 匿名として扱い、ログに残す。
- OAuth の失敗: Better Auth のエラーページ/コールバックのエラーパラメータを nav-bar で表示する(既存のエラー表示方法に合わせる)。

## テスト

- 既存の `_getUid` 注入テストは維持する。
- `nav-bar.test.tsx`、`searcher.test.tsx`、`item-fetcher.test.tsx`、`walk-actions.test.ts` の Firebase 関連 mock と `idTokenExpired` を更新する。
- `getUid` / `getSelfStatusAction` が `getSession` の結果から正しく導出することを単体テストで確認する。
- DB マイグレーション(`users` 列追加、`session` / `account` / `verification`)を `lib/drizzle/test-db.ts` で検証する。
- `vp check` と `vp test` が通ること。ローカルで Google ログイン → walk 作成 → ログアウトを手動確認する。

## 実装調査で確定した事項(追記)

- **列マッピングは Drizzle の TS キーで行う。** Better Auth の既定フィールド名(`id`/`name`/`image`)に合わせ、`users` テーブルの TS キーを `id`/`name`/`image` にし、DB 列名(`uid`/`display_name`/`photo_url`)は変えない。これにより DB 側の列リネームと `bin/manage-users.js`(生 SQL で `uid` を使用)の変更が不要になる。アプリ側の型 `UserT`(`uid`/`displayName`/`photoURL`)は `getUsersAction` で詰め替えて維持する。
- **`users` の `createdAt`/`updatedAt` は `mode: 'date'` にする**(現状は `'string'`)。Better Auth は `Date` を前提に扱うため。DB 型は変わらない。`session`/`account`/`verification` も `Date` モード。
- **Workers ではリクエストごとに DB クライアントを作る**(`lib/drizzle/db.ts` の `getDb()` の制約)。そのため認証インスタンスは `getAuth()`(async ファクトリ)とし、Workers ではリクエストごと、Node では singleton にする。
- **`getSelfStatusAction` は残す。** クライアントの `selfStatus` はこれから導出し、Better Auth のクライアント側の型推論(`inferAdditionalFields`)に依存しない。
- **クライアントの `currentUser` は `{ uid, displayName, photoURL } | null | undefined` に詰め替える**(`undefined` = セッション解決待ち、`null` = サインアウト)。`item-box`/`walk-editor`/`nav-bar` の既存の参照(`currentUser.uid` 等)を維持できる。
- **追加の変更箇所**: `app/show/[id]/_components/item-box.tsx` と `app/(editor)/_components/walk-editor.tsx`(`idTokenExpired` 再試行の削除)、`app/show/[id]/page.tsx`(state の `idTokenExpired` 削除)、`Dockerfile`、`.github/workflows/publish-docker-image.yml`、`.github/workflows/deploy-cloudflare-workers.yml`、`cloudflare.config.ts` のコメント、`README.md`。
- **前提チェック**: Better Auth の Drizzle アダプターが `drizzle-orm@1.0.0-rc.4` で動くことを最初のタスクで確認する。動かない場合は実装を止めてユーザーに報告する(別アダプターへの独断での切り替えはしない)。
- **`email`** は既存データが nullable のため nullable のまま(Better Auth は Google から必ず受け取る)。

## 非ゴール

- Google 以外の認証手段の実装。
- Supabase / Workers 移行(別計画)。ただし Better Auth + Postgres のセッションはそれと両立する。
