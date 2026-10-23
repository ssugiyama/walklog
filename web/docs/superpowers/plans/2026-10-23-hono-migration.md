# Next.js → Hono + React SPA 移行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js/vinext を廃止し、Hono サーバー + Vite ビルドの React SPA(TanStack Router)に置き換え、Cloudflare Workers と Docker(Node)の両方で同じ動作を保つ。

**Architecture:** `server/` に両ランタイム共通の Hono アプリ(`createApp(platform)`)を置き、旧 Server Actions のロジックを Next 非依存のサービス関数に移して `/api/*` で公開する。ページ系 GET はビルド済み `index.html` の `<head>` にメタ情報を差し込んで返す。クライアントは旧 Server Action と同じシグネチャの関数(`lib/api/actions.ts`)と `next/navigation` 互換の薄いアダプタ(`lib/utils/navigation.tsx`)を用意し、既存コンポーネントの変更を import の差し替え中心に抑える。

**Tech Stack:** hono 4.13, @hono/node-server 2.1, @hono/zod-validator 0.9, @tanstack/react-router 1.170, nuqs(`nuqs/adapters/tanstack-router`), @fontsource/roboto 5.3, Vite+ / @cloudflare/vite-plugin, better-auth, drizzle, Vitest + pglite。

**Spec:** `docs/superpowers/specs/2026-10-23-hono-migration-design.md`

## Global Constraints

- 画面・操作・機能は現状と同一。ルート遷移(`/` ↔ `/show/:id` ↔ `/edit/:id` ↔ `/new`)で地図(`GMap`)を再マウントしない。
- Cloudflare Workers と Docker(Node)の両方で動作すること。
- DB スキーマ・better-auth の設定は変更しない。
- 最終的に `next`, `vinext`, `@vinext/cloudflare`, `react-server-dom-webpack`, `@vitejs/plugin-rsc`, `@mui/material-nextjs` を依存から削除する(`buffer`/`util` polyfill は wkx がブラウザで使うので残す)。
- クライアント向け環境変数名は `NEXT_PUBLIC_*` のまま(Vite `envPrefix: 'NEXT_PUBLIC_'`)。`SITE_NAME`, `SITE_DESCRIPTION`, `THEME_COLOR*` はサーバーがリクエスト時に読む。
- エラーメッセージ「Image size must be 2MB or less」等、既存の検証メッセージは文言を変えない。画像上限 2MB、リクエストボディ上限 3MB。
- タイトル書式: 既定 `SITE_NAME || 'Walklog'`、ページ別は `` `${title} | ${siteName}` ``。show ページの title は `` `${item.date} : ${item.title} (${item.length.toFixed(1)} km)` ``、description は `` `${comment.replace(/[\n\r]/g, '').substring(0, 140)}...` ``(comment があるときのみ)。
- `null`/`undefined` の使い分けは AGENTS.md の規約に従う(nuqs・`URLSearchParams.get()`・React の `return null` は例外)。
- 各タスク完了時に `vp check` と `vp test` を通す(Task 7 完了までは旧 `app/` 側のテストも通っていること)。
- 実装前に hono / TanStack Router / @cloudflare/vite-plugin の現行ドキュメントを確認する。

## Review Focus

1. **URL クエリの往復で値が変わらない**: TanStack Router の既定 search パーサは JSON 解釈するため、`?center=35.6,139.6&year=2024&filter=` が `?year=2024` 等に化ける恐れがある。プレーンな `URLSearchParams` で parse/stringify し、そのまま往復すること(Task 6 にテスト)。
2. **ログイン直後・未承認ユーザー**: セッション Cookie 付きの API 呼び出しで `getSelfStatus` が `active`/`pending`/`anonymous` を正しく返し、pending ユーザーの作成・編集は 403(Task 3 にテスト)。
3. **存在しない/他人の下書き id で `/show/:id` を開く**: API は 404、ページ HTML はデフォルトの head のまま 200 で返り、クライアントで not-found 表示(Task 3, 4, 7 にテスト)。
4. **別オリジンからの状態変更リクエスト**: `POST /api/items`(multipart)と `DELETE /api/items/:id` は別 Origin で 403(Task 3 にテスト)。
5. **書き込み直後の検索**: 作成・更新・削除の直後の検索で自分の変更が反映される(メモリキャッシュでは即時、KV では結果整合で許容)(Task 2 にテスト)。

---

## File Structure

```
web/
  server/
    app.ts                 createApp(platform): Hono。export type AppType
    platform.ts            Platform 型(getTemplate, cache)
    http-error.ts          HttpError(status: 400|401|403|404)
    cache/types.ts         AppCache インターフェース, cached() ヘルパ
    cache/memory.ts        memoryCache(): AppCache
    cache/kv.ts            kvCache(kv: KVNamespace): AppCache
    services/session.ts    getSessionUser / getUid / getSelfStatus (headers を受ける)
    services/walks.ts      旧 walk-actions のロジック(Next 非依存)
    routes/api.ts          /api/* ルート。export type ApiType
    routes/pages.ts        SPA シェル + head 差し込み、/walk/:id、manifest
    head.ts                HeadData, renderHead(), injectHead()
  worker.ts                Workers エントリ
  server.ts                Node エントリ
  vite/hono-dev.ts         Node 開発用 Vite プラグイン
  index.html               SPA エントリ HTML(<!--app-head--> プレースホルダ)
  src/
    main.tsx               マウント + フォント
    router.tsx             TanStack Router のルート定義
    components/            旧 app/_components
    routes/home/           旧 app/(home)
    routes/show/           旧 app/show/[id]
    routes/editor/         旧 app/(editor)
    routes/error-views.tsx 旧 error/not-found/forbidden/unauthorized
  lib/api/client.ts        hc<ApiType> クライアント
  lib/api/actions.ts       旧 Server Action と同名・同シグネチャのクライアント関数
  lib/utils/navigation.tsx next/navigation・next/link 互換アダプタ
  lib/utils/document-title.ts useDocumentTitle
```

`lib/actions/walk-actions.ts`, `app/`, `next.config.ts`, `next-env.d.ts` は最終的に削除する。

---

### Task 1: 依存追加・HttpError・キャッシュ層

**Files:**
- Modify: `package.json`(`hono`, `@hono/node-server`, `@hono/zod-validator` を追加。`vp add` で)
- Create: `server/http-error.ts`, `server/cache/types.ts`, `server/cache/memory.ts`, `server/cache/kv.ts`
- Test: `server/cache/memory.test.ts`, `server/cache/kv.test.ts`

**Interfaces:**
- Produces:
  - `class HttpError extends Error { constructor(status: 400 | 401 | 403 | 404, message?: string); status }`
  - `interface AppCache { get<T>(key: string): Promise<T | undefined>; set<T>(key: string, value: T, ttlSeconds: number): Promise<void>; getTagVersion(tag: string): Promise<string>; bumpTag(tag: string): Promise<void> }`
  - `cached<T>(cache: AppCache, opts: { key: string; tags?: string[]; ttlSeconds: number }, fn: () => Promise<T>): Promise<T>` — タグのバージョンをキーに連結し(`${key}|${tag}@${version}...`)、`bumpTag` でバージョンを変えて無効化する方式。
  - `memoryCache(maxEntries = 500): AppCache`(LRU + TTL)
  - `kvCache(kv: KVNamespace): AppCache`(`expirationTtl` は KV の下限 60 秒以上に丸める。タグバージョンは `tag:<name>` キーに保存)

- [ ] **Step 1: テストを書く** — `memory.test.ts`:
  - `cached` が 2 回目の呼び出しで `fn` を呼ばない
  - `bumpTag('search')` 後は `fn` が再度呼ばれる
  - TTL 経過後(`vi.useFakeTimers`)は再計算
  - `maxEntries` 超過で最古のキーが消える
  `kv.test.ts`: `get/put` を Map で実装したフェイク KV で、上の最初の 2 ケースと「`expirationTtl` が 60 未満にならない」を確認。
- [ ] **Step 2: 失敗を確認** — Run: `vp test run server/cache` / Expected: FAIL(モジュールなし)
- [ ] **Step 3: 実装** — 上記シグネチャどおり。値は JSON シリアライズ可能なものに限る前提(KV は `put(key, JSON.stringify(v))`)。
- [ ] **Step 4: 通過を確認** — Run: `vp test run server/cache` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(server): add cache layer and HttpError for Hono migration"`

### Task 2: サービス層(旧 walk-actions を Next 非依存に)

**Files:**
- Create: `server/services/session.ts`, `server/services/walks.ts`
- Test: `server/services/walks.test.ts`(`lib/actions/walk-actions.test.ts` を移植。旧ファイルは Task 7 で削除するまで残す)

**Interfaces:**
- Consumes: Task 1 の `HttpError`, `AppCache`, `cached`
- Produces:
  - `getSessionUser(headers: Headers): Promise<SessionUser | undefined>`(失敗時は `console.error` して undefined。現行と同じ)
  - `getUid(headers: Headers): Promise<string | null>`(active のときだけ id)
  - `getSelfStatus(headers: Headers): Promise<SelfStatusT>`
  - `search(props: SearchProps, uid: string | null, cache: AppCache): Promise<Pick<SearchState, 'rows' | 'count' | 'offset' | 'error'>>` — 旧 `searchInternalAction` の本体。`cached({ key: 'search:' + JSON.stringify([props, uid]), tags: ['search'], ttlSeconds: 900 })`。検証エラー等は throw せず `error` で返す(現行どおり)。
  - `getItem(id: number, uid: string | null): Promise<WalkT | null | undefined>` — 存在しない: `undefined`、他人の下書き: `null`。キャッシュしない。
  - `updateItem(formData: FormData, uid: string | null, cache: AppCache, deps?: { saveImage; deleteImage }): Promise<{ id?: number; error?: string }>` — uid なし: `HttpError(401)`、他人の walk: `HttpError(403)`、対象なし: `HttpError(404)`。成功時 `cache.bumpTag('search')`。
  - `deleteItem(id: number, uid: string | null, cache: AppCache): Promise<void>` — 401/404/403 は同上。成功時 `bumpTag('search')`。
  - `getCities(params: CityParams, cache: AppCache): Promise<CityT[]>` — `cached({ key: 'cities:' + JSON.stringify(params), ttlSeconds: 900 })`
  - `getUsers(cache: AppCache): Promise<UserT[]>` — `cached({ key: 'users', ttlSeconds: 900 })`

- [ ] **Step 1: テストを移植** — `walk-actions.test.ts` の各 describe を新関数に対応させる。`next/*` のモックは削除し、`@/lib/auth` と `../../lib/drizzle/db`(pglite)のモックは維持。`useActionState` 用の `serial`/`prevState` に関するアサーションは Task 5 に移すので外す。`unauthorized()`/`forbidden()`/`notFound()` を期待していたケースは `rejects.toMatchObject({ status: 401 | 403 | 404 })` に置き換える。キャッシュには `memoryCache()` を渡す。Review Focus 5 用に追加:
  ```ts
  it('reflects an update in the next search (search tag bumped)', async () => {
    const cache = memoryCache()
    const before = await search(props, uid, cache)
    await updateItem(formDataFor(newWalk), uid, cache, deps)
    const after = await search(props, uid, cache)
    expect(after.count).toBe(before.count + 1)
  })
  ```
  削除についても同様のテストを置く。
- [ ] **Step 2: 失敗を確認** — Run: `vp test run server/services` / Expected: FAIL
- [ ] **Step 3: 実装** — `lib/actions/walk-actions.ts` からクエリロジックをそのまま移し、`'use server'`、`next/*` の import、`connection()`、RSC 回避のためのコメントを除く。`session.ts` は `auth.api.getSession({ headers })` を使う。
- [ ] **Step 4: 通過を確認** — Run: `vp test run server/services lib/actions` / Expected: PASS(旧テストも通ったまま)
- [ ] **Step 5: Commit** — `git commit -m "feat(server): port walk actions to framework-agnostic services"`

### Task 3: API ルート

**Files:**
- Create: `server/routes/api.ts`, `server/platform.ts`
- Test: `server/routes/api.test.ts`

**Interfaces:**
- Consumes: Task 2 のサービス関数
- Produces:
  - `type Platform = { getTemplate(c: Context): Promise<string>; cache(c: Context): AppCache }`(`server/platform.ts`)
  - `createApiRoutes(platform: Platform): Hono`、`export type ApiType = ReturnType<typeof createApiRoutes>`
  - ルート(すべて `/api` 配下):
    | メソッド・パス | 入力 | 200 応答 |
    | --- | --- | --- |
    | `GET /self-status` | — | `{ status: SelfStatusT }` |
    | `POST /search` | JSON `SearchProps`(zod `searchPropsSchema` 相当で緩く受け、詳細検証は service) | `{ rows, count, offset, error? }` |
    | `GET /items/:id` | `idParamSchema` | `{ current: WalkT \| null }`(undefined は 404) |
    | `POST /items` | multipart(旧 FormData そのまま) | `{ id?: number; error?: string }` |
    | `DELETE /items/:id` | `idParamSchema` | `{ deleted: true }` |
    | `POST /cities` | JSON `CityParams` | `CityT[]` |
    | `GET /users` | — | `UserT[]` |
    | `ALL /auth/*` | — | `getAuth()` の `handler(c.req.raw)` |
  - `HttpError` は `app.onError` で `c.json({ error: message }, status)` に変換。
  - `csrf()` を `/api/*` に掛ける(`/api/auth/*` は better-auth 自身の検証に任せて除外)。`bodyLimit({ maxSize: 3 * 1024 * 1024 })` を `POST /items` に掛ける。

- [ ] **Step 1: テストを書く** — `app.request()` で叩く。`@/lib/auth` は Task 2 と同じくモックし、`server/services/walks` は `vi.mock` で差し替えてルーティングだけを検証:
  - `GET /api/items/999` で service が undefined → 404
  - service が `HttpError(403)` を throw → 403 と `{ error }`
  - `POST /api/items` に `Origin: https://evil.example` と multipart → 403(Review Focus 4)
  - `DELETE /api/items/1` に別 Origin → 403
  - 3MB 超の multipart → 413
  - pending ユーザーのセッションで `GET /api/self-status` → `{ status: 'pending' }`、`POST /api/items` → 403(Review Focus 2。こちらは services をモックせず pglite を使う別 describe でもよい)
- [ ] **Step 2: 失敗を確認** — Run: `vp test run server/routes/api` / Expected: FAIL
- [ ] **Step 3: 実装** — `@hono/zod-validator` で params/json を検証。uid は各ハンドラで `getUid(c.req.raw.headers)`。
- [ ] **Step 4: 通過を確認** — Run: `vp test run server/routes/api` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(server): expose walk services as Hono API routes"`

### Task 4: ページ・head 差し込み・createApp

**Files:**
- Create: `server/head.ts`, `server/routes/pages.ts`, `server/app.ts`, `index.html`
- Modify: `lib/utils/meta-utils.ts`(`walkTitle(item: WalkT): string`, `walkDescription(item: WalkT): string | undefined` を追加)
- Test: `server/head.test.ts`, `server/routes/pages.test.ts`, `lib/utils/meta-utils.test.ts`

**Interfaces:**
- Consumes: `Platform`(Task 3)、`getItem`(Task 2)、`resolveThemeColors`, `themeBackgroundCss`(既存 `lib/utils/theme-color.ts`)
- Produces:
  - `type HeadData = { title?: string; description?: string; ogTitle?: string; ogUrl?: string; ogImage?: string }`
  - `renderHead(head: HeadData, env: Record<string, string | undefined>): string` — `<title>`, `description`, `og:*`, `theme-color`(light/dark が同じなら 1 つ、違えば `media` 付き 2 つ)、`<style>` に `themeBackgroundCss`、`apple-mobile-web-app-capable`/`-title`/`-status-bar-style=default`、`<link rel="manifest" href="/manifest.webmanifest">`。値は HTML エスケープする。
  - `injectHead(template: string, headHtml: string): string` — `<!--app-head-->` を置換。
  - `createPageRoutes(platform: Platform): Hono`
  - `createApp(platform: Platform): Hono`(`/api` → api ルート、それ以外 → page ルート)、`export type AppType`
  - `index.html`: `<html lang="en" style="height:100%">`、`<head>` に `<!--app-head-->`、`<body style="margin:0;height:100%">` に `<div id="root" style="height:100%">` と `<script type="module" src="/src/main.tsx">`。
- ページの対応:
  | パス | head |
  | --- | --- |
  | `/` | description と og:title = `SITE_DESCRIPTION`, og:url `/` |
  | `/show/:id` | `getItem` 成功時 `walkTitle`/`walkDescription`/og:image/og:url(`idToShowUrl`)。id 不正・取得失敗・null は既定 head のまま 200 |
  | `/new` | title `new walk` |
  | `/edit/:id` | title `` `edit walk : ${id}` `` |
  | `/walk/:id` | `/show/:id` へ 302。id 不正は 404 |
  | `/manifest.webmanifest` | 現 `app/manifest.ts` と同じ JSON |
  | その他 GET(拡張子なし) | 既定 head で 200 |

- [ ] **Step 1: テストを書く**
  - `renderHead({ title: 'x' }, { SITE_NAME: 'W' })` が `<title>x | W</title>` を含む。title なしは `<title>W</title>`、SITE_NAME なしは `Walklog`
  - `renderHead` が `<script>` を含む title をエスケープする
  - light ≠ dark で `theme-color` メタが 2 つ(`media` 付き)
  - `GET /show/1`(item あり、`getItem` をモック)で og:image と `walkTitle` が入る
  - `GET /show/999`(undefined)、`GET /show/abc` が 200 で既定 title(Review Focus 3)
  - `GET /walk/5` → 302 `Location: /show/5`、`GET /walk/x` → 404
  - `GET /manifest.webmanifest` の `theme_color` が `THEME_COLOR_LIGHT`
- [ ] **Step 2: 失敗を確認** — Run: `vp test run server lib/utils/meta-utils` / Expected: FAIL
- [ ] **Step 3: 実装** — env は `process.env` から読む(Workers は `nodejs_compat` + compatibilityDate 2026-07-27 で populate される。Task 8 で実機確認)。
- [ ] **Step 4: 通過を確認** — Run: `vp test run server lib/utils/meta-utils` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(server): serve SPA shell with injected head metadata"`

### Task 5: クライアント API 層

**Files:**
- Create: `lib/api/client.ts`, `lib/api/actions.ts`
- Test: `lib/api/actions.test.ts`

**Interfaces:**
- Consumes: `ApiType`(Task 3)
- Produces(旧 Server Action と同名・同シグネチャ。コンポーネントは import 元を変えるだけで済む):
  - `getSelfStatusAction(): Promise<SelfStatusT>`
  - `searchAction(prev: SearchState, props: SearchProps): Promise<SearchState>` — `serial++`、`error = null`、`append = props.offset > 0`、応答をマージ。通信失敗も `error` に入れて throw しない(現行どおり)。
  - `getItemAction(prev: GetItemState, id: number): Promise<GetItemState>` — `serial++`。404 は `HttpError(404)` を throw(エラー境界で not-found 表示)。その他のエラーは `error` に入れる。
  - `updateItemAction(prev: UpdateItemState, formData: FormData): Promise<UpdateItemState>` — `serial++`、`id` を一旦 undefined。401/403/404 は `HttpError` を throw、`{ error }` は state に入れる。
  - `deleteItemAction(prev: DeleteItemState, id: number): Promise<DeleteItemState>`
  - `getCityAction(params: CityParams): Promise<CityT[]>`、`getUsersAction(): Promise<UserT[]>`
  - `HttpError` はクライアントでも同じクラスを使う(`server/http-error.ts` は Node/Workers 依存がないので共有可)。

- [ ] **Step 1: テストを書く** — `fetch` を `vi.stubGlobal` でモック:
  - `searchAction({ ..., serial: 1 }, { offset: 20, ... })` が `serial: 2, append: true` を返す
  - search API が 500 → throw せず `error` に文字列
  - `getItemAction` が 404 で `HttpError` status 404 を reject
  - `updateItemAction` が `{ error: 'Image size must be 2MB or less' }` を `state.error` に入れる
  - `updateItemAction` が 401 で `HttpError(401)` を reject
- [ ] **Step 2: 失敗を確認** — Run: `vp test run lib/api` / Expected: FAIL
- [ ] **Step 3: 実装** — `hc<ApiType>('/')`。Cookie は同一オリジンなので既定で送られる。
- [ ] **Step 4: 通過を確認** — Run: `vp test run lib/api` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(client): add RPC client with server-action compatible signatures"`

### Task 6: ナビゲーション互換アダプタ

**Files:**
- Modify: `package.json`(`@tanstack/react-router` を追加)
- Create: `lib/utils/navigation.tsx`, `lib/utils/document-title.ts`
- Test: `lib/utils/navigation.test.tsx`, `lib/utils/document-title.test.ts`

**Interfaces:**
- Produces:
  - `useSearchParams(): URLSearchParams`(`useRouterState({ select: s => s.location.searchStr })` から生成)
  - `useParams(): Record<string, string>`(`strict: false`)
  - `usePathname(): string`
  - `useRouter(): { push(href: string): void; replace(href: string): void }`(`navigate({ href, replace })`)
  - `Link`: `forwardRef<HTMLAnchorElement, AnchorHTMLAttributes & { href: string }>`。修飾キーなしの左クリックは `preventDefault` してから `navigate({ href })` する。渡された `onClick` は先に呼び、`defaultPrevented` なら遷移しない(`map.tsx` の `rc.interceptLink` のため)。MUI の `component={Link}` で使えること。
  - `parseSearch(searchStr: string): Record<string, string>`、`stringifySearch(search: Record<string, string>): string` — プレーンな `URLSearchParams`。Task 7 の router で使う。
  - `useDocumentTitle(title?: string): void` — `document.title` を `` title ? `${title} | ${siteName}` : siteName `` にする。siteName は `meta[name="apple-mobile-web-app-title"]` の content(なければ `'Walklog'`)。
- [ ] **Step 1: テストを書く**
  - `stringifySearch(parseSearch('?center=35.6,139.6&year=2024&filter=&order=newest_first'))` が入力と同じ文字列(Review Focus 1)
  - `createMemoryHistory` で作ったルーター上で `useSearchParams().get('year')` が `'2024'`(数値化されない)
  - `Link` クリックで履歴が進み、`onClick` で `preventDefault` したときは進まない
  - `useDocumentTitle('x')` で `document.title === 'x | W'`(meta content `W`)
- [ ] **Step 2: 失敗を確認** — Run: `vp test run lib/utils/navigation lib/utils/document-title` / Expected: FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: 通過を確認** — 同コマンド / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(client): add next/navigation-compatible adapter on TanStack Router"`

### Task 7: クライアント SPA 化

**Files:**
- Move(`git mv`): `app/_components/*` → `src/components/`, `app/(home)/_components/*` → `src/routes/home/`, `app/show/[id]/_components/*` → `src/routes/show/`, `app/(editor)/_components/*` → `src/routes/editor/`, `app/icons/*` → `public/icons/`, `app/favicon.ico` → `public/favicon.ico`, `app/opengraph-image.png` → `public/opengraph-image.png`
- Create: `src/main.tsx`, `src/router.tsx`, `src/routes/error-views.tsx`
- Modify: `lib/utils/searcher.tsx`, `lib/utils/item-fetcher.tsx`, `lib/utils/user-context.tsx`, `lib/utils/config.tsx`, 移動した各コンポーネントとテスト, `src/components/body.tsx`, `src/components/main.tsx`
- Delete: `app/`(page/layout/manifest/route/error 系すべて), `lib/actions/`, `@mui/material-nextjs`, `nuqs/adapters/next/app` の利用

**Interfaces:**
- Consumes: Task 5 の actions、Task 6 のアダプタと `parseSearch`/`stringifySearch`/`useDocumentTitle`、Task 1 の `HttpError`
- Produces:
  - `router`(`createRouter({ routeTree, parseSearch, stringifySearch })`)。ルート: root(コンポーネント = `Body` → `Main` が `<Outlet />` を children に持つ)、`/`、`/show/$id`、`/new`、`/edit/$id`。root に `notFoundComponent` と `errorComponent`。
  - `ErrorView({ error }: { error: unknown })` — `HttpError` 401 → 旧 unauthorized、403 → 旧 forbidden、404 → 旧 not-found、それ以外 → 旧 AppError の UI(旧ファイルの JSX をそのまま移す)。
- ページ相当コンポーネントの中身は旧 `page.tsx` と同じ:
  - `/`: `<Searcher /><SearchBox />`、`useDocumentTitle()`
  - `/show/$id`: `<ItemFetcher /><ItemBox />`、`useDocumentTitle(data.current ? walkTitle(data.current) : undefined)`
  - `/new`: `<WalkEditor mode="create" />`、title `new walk`
  - `/edit/$id`: `<ItemFetcher /><WalkEditor mode="update" />`、title `` `edit walk : ${id}` ``

- [ ] **Step 1: ファイルを移動して import を直す** — `@/app/...` の参照と相対 import を新パスへ。`next/navigation` と `next/link` → `@/lib/utils/navigation`、`@/lib/actions/walk-actions` → `@/lib/api/actions`。
- [ ] **Step 2: walk-editor の `unauthorized()`/`forbidden()` を差し替える** — render 中に `throw new HttpError(401)` / `throw new HttpError(403)` して、エラー境界の `ErrorView` に表示させる。
- [ ] **Step 3: Provider を差し替える** — `body.tsx` から `AppRouterCacheProvider` を外す(MUI は既定の emotion cache のまま)。`main.tsx` の `NuqsAdapter` を `nuqs/adapters/tanstack-router` に。`src/main.tsx` で `@fontsource/roboto/{300,400,500,700}.css` を import し、`RouterProvider` を `#root` にマウント。
- [ ] **Step 4: env を置換** — `lib/utils/config.tsx` の `process.env.NEXT_PUBLIC_*` を `import.meta.env.NEXT_PUBLIC_*` に。`vite.config.ts` に `envPrefix: 'NEXT_PUBLIC_'`。
- [ ] **Step 5: テストのモックを置換** — `vi.mock('next/navigation', ...)` → `vi.mock('@/lib/utils/navigation', ...)`、`next/link` のモックも同様。`lib/actions/walk-actions` のモック → `@/lib/api/actions`。`process.env.NEXT_PUBLIC_*` を設定していたテストは `vi.stubEnv` に。walk-editor のテストで `unauthorized`/`forbidden` を期待していた箇所は `HttpError` の throw を期待する形に。
- [ ] **Step 6: ルーターのテストを追加** — `src/router.test.tsx`: `createMemoryHistory` で `/` → `/show/1` → `/edit/1` と遷移しても `GMap` のモックの mount 回数が 1 のまま(アンチゴール。`@/src/components/map` を mount 時にカウンタを増やすモックに差し替える)。`/nonexistent` で not-found の文言が出る。`getItemAction` が `HttpError(404)` を reject するとき `/show/999` で not-found 表示(Review Focus 3)。
- [ ] **Step 7: 確認** — Run: `vp check && vp test` / Expected: すべて PASS、`grep -rn "from 'next" src lib server` が 0 件
- [ ] **Step 8: Commit** — `git commit -m "feat(client): convert app to TanStack Router SPA"`

### Task 8: ランタイム・ビルド構成

**Files:**
- Create: `worker.ts`, `server.ts`, `vite/hono-dev.ts`
- Modify: `vite.config.ts`, `cloudflare.config.ts`, `package.json`, `lib/utils/image-storage/local.ts`, `tsconfig.json`
- Delete: `next.config.ts`, `next-env.d.ts`。依存から `next`, `vinext`, `@vinext/cloudflare`, `react-server-dom-webpack`, `@vitejs/plugin-rsc`, `@mui/material-nextjs` を削除(`vp remove`)

**Interfaces:**
- Consumes: `createApp(platform)`(Task 4)、`memoryCache`, `kvCache`(Task 1)
- Produces:
  - `worker.ts`: `export default { fetch }`。`Platform` は `getTemplate = c => env.ASSETS.fetch(new URL('/index.html', c.req.url)).then(r => r.text())`、`cache = () => kvCache(env.CACHE_KV)`。Hono で扱わないパス(静的ファイル)は `env.ASSETS.fetch(c.req.raw)` にフォールバック。
  - `server.ts`: `@hono/node-server` の `serve`。`serveStatic({ root: './dist/client' })` と `/uploads/*` → `./public/uploads`。`getTemplate` は起動時に `dist/client/index.html` を読み込んで保持、`cache` はモジュール単位の `memoryCache()`。`PORT` 既定 3000。
  - `vite/hono-dev.ts`: `honoDev(): Plugin`。`configureServer` で、`/api/*` とページ系パス(拡張子なし、`/@`・`/src/`・`/node_modules/` 以外)を `server.environments.ssr.runner.import('/server/app.ts')` の `createApp` に渡す。`getTemplate` は `server.transformIndexHtml(url, fs.readFileSync('index.html'))`。リクエスト変換は `@hono/node-server` の `getRequestListener`。
  - `vite.config.ts`: vinext と `walklog:client-util-polyfill` 以外の vinext 用設定を外す(util polyfill はクライアント用に残す)。`process.env.WALKLOG_TARGET === 'node'` のときは `cloudflare()` を外して `honoDev()` を入れ、`build.outDir = 'dist/client'`。それ以外は `cloudflare()`(既定の worker 環境)。`@vitejs/plugin-react` を追加。
  - `cloudflare.config.ts`: `entrypoint: './worker.ts'`、`runWorkerFirst: ['/*', '!/assets/*']`(コメントも新しい理由に更新)、KV バインディング名 `CACHE_KV`(`VINEXT_KV_CACHE` から変更。`KV_CACHE_ID` 環境変数はそのまま)。
  - `local.ts`: `UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')`。
  - `package.json` scripts: `dev`: `WALKLOG_TARGET=node vp dev`、`build`: `WALKLOG_TARGET=node vp build && vp pack server.ts -d dist/node`(Node サーバーのバンドル。`vp pack` の出力先・external 指定は tsdown のドキュメントで確認)、`start`: `node dist/node/server.js`、`start-in-docker` は削除。`vp run` タスク(`cf-build`, `cf-dev`, `preview`, `deploy`, `upload`, `cf-typegen`)は `deploy`/`upload` を `cf`/wrangler の deploy コマンドに置換し、他は維持。
- [ ] **Step 1: 構成を書く**(上記)
- [ ] **Step 2: Node で確認** — Run: `vp run build && node dist/node/server.js` → `curl -s localhost:3000/ | grep '<title>'` / Expected: `SITE_NAME` の title。`curl -s localhost:3000/api/users` が JSON 配列。
- [ ] **Step 3: Node 開発サーバーで確認** — Run: `vp run dev` → ブラウザで `/` を開き、地図が表示され、コンポーネントを編集すると HMR が効く。
- [ ] **Step 4: Workers で確認** — Run: `vp run preview` → `curl` で `/`, `/show/<既存id>` の og メタ、`/api/users`。`process.env.SITE_NAME` が Workers で読めていること(読めなければ `c.env` 経由に切り替え、`renderHead` に env を渡す箇所を直す)。
- [ ] **Step 5: 確認** — Run: `vp check && vp test` / Expected: PASS、`vp why next` が何も返さない
- [ ] **Step 6: Commit** — `git commit -m "build: run Hono app on Workers and Node, drop Next.js and vinext"`

### Task 9: Docker・CI・ドキュメント

**Files:**
- Modify: `Dockerfile`, `../docker-compose.yml`, `../.github/workflows/ci.yml`, `../.github/workflows/deploy-cloudflare-workers.yml`, `../.github/workflows/publish-docker-image.yml`, `../README.md`, `AGENTS.md`, `CLAUDE.md`
- [ ] **Step 1: Dockerfile** — deps → build(`NEXT_PUBLIC_*` の ARG はビルド時インラインのため維持。`THEME_COLOR*` の ARG は削除)→ runner(`dist/client`, `dist/node`, 実行に要る `node_modules` だけ。`CMD ["node", "dist/node/server.js"]`、`WORKDIR /app`)。
- [ ] **Step 2: docker-compose.yml** — uploads のマウント先を `/app/public/${IMAGE_PREFIX:-uploads}` に変更(設計書の判断: コンテナを作り直しても画像が残るようにする)。起動コマンドが `server.js` を参照していれば新しいパスに。
- [ ] **Step 3: CI** — workflow 内の `next build`/vinext/`VINEXT_KV_CACHE` の参照を新しいタスクとバインディング名に更新。
- [ ] **Step 4: README / AGENTS.md / CLAUDE.md** — Next.js 前提の記述(`next dev`、`NEXT_PUBLIC_*` は Next の挙動、THEME_COLOR はビルド時、等)を更新。AGENTS.md の Next.js ブロック(`next dev` が再生成するもの)を削除。
- [ ] **Step 5: 確認** — Run: `docker build -t walklog-test --build-arg NEXT_PUBLIC_DEFAULT_CENTER=35.68,139.76 web && docker run --rm -p 3000:3000 --env-file web/.env walklog-test` → `curl -s localhost:3000/ | grep '<title>'` / Expected: title が出る
- [ ] **Step 6: Commit** — `git commit -m "chore: update Docker, CI and docs for Hono runtime"`

### Task 10: 両ランタイムでの手動確認

- [ ] **Step 1: Node(Docker)で確認** — ログイン/ログアウト、検索(各フィルタ・もっと読む)、詳細表示、新規作成(画像あり。2MB 超でエラー文言)、編集、削除、`/walk/:id` リダイレクト、`/show/:id` の OGP メタ(`curl`)、`/manifest.webmanifest`、未承認ユーザーの pending 表示、遷移で地図が保持されること、コンテナを作り直しても画像が残ること。
- [ ] **Step 2: Workers(`vp run preview`)で同じ項目を確認**(画像は R2)
- [ ] **Step 3: 結果を記録** — 確認できなかった項目があれば、その理由と一緒に PR 説明に書く。
