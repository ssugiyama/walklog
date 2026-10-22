# Next.js → Hono + React SPA 移行 設計

## 目的・背景

Next.js(現状は vinext 経由で Cloudflare Workers、Docker では Next standalone)をやめ、サーバーを Hono、クライアントを Vite でビルドする React SPA に置き換える。

動機は「今のモダンなスタックで作り直したい」こと。特定の障害を直すための移行ではない。副次効果として、Next.js 固有の挙動(RSC、`'use cache'` の同時リクエストハング、vinext 用 polyfill、Cache Components の `connection()` マーカー等)への依存がなくなる。

vinext は本移行で廃止する。

### HonoX を採用しない理由

当初は Hono + HonoX を検討したが不採用。このアプリは実態がクライアント SPA で(地図と MUI の画面がルート遷移をまたいで保持される)、サーバー描画は `<head>` のメタ情報程度しかない。HonoX の強み(ファイルベース SSR + islands の MPA)が活きず、むしろページ遷移ごとに地図が作り直されて現在の操作感を損なう。

## 現状(調査結果)

- `'use client'` ファイル 14、合計約 1 万行。画面はすべてクライアントコンポーネント。
- サーバー側の描画は実質以下のみ:
  - `app/layout.tsx`: `<title>` テンプレート(`SITE_NAME`)、`themeColor` viewport、テーマ背景 CSS、`appleWebApp`、Roboto(`next/font/google`)
  - `app/(home)/page.tsx`: `description` / OGP
  - `app/show/[id]/page.tsx`: `generateMetadata` で DB から item を取得し title/description/OGP image
  - `app/(editor)/edit/[id]/page.tsx`, `app/(editor)/new/page.tsx`: title
  - `app/walk/[id]/page.tsx`: `/show/:id` へのリダイレクト(不正 id は 404)
  - `app/manifest.ts`: PWA manifest
  - `app/error.tsx`, `not-found.tsx`, `forbidden.tsx`, `unauthorized.tsx`
- データアクセスはすべて `lib/actions/walk-actions.ts` の Server Actions を RPC として呼ぶ:
  `getSelfStatusAction`, `searchAction`(内部で `'use cache'` の `searchInternalAction`), `getItemAction`, `updateItemAction`(FormData、画像 2MB まで), `deleteItemAction`, `getCityAction`(`'use cache'`), `getUsersAction`(`'use cache'`)。クライアントからは `useActionState` / 直接 await で呼ばれている(`lib/utils/searcher.tsx`, `item-fetcher.tsx`, `user-context.tsx`, `app/_components/map.tsx`, `walk-editor.tsx`, `item-box.tsx`)。
- Next 固有 API の利用: `next/navigation`(`useSearchParams`, `useParams`, `usePathname`, `useRouter`, `notFound`, `redirect`, `forbidden`, `unauthorized`)、`next/link`、`next/cache`(`cacheTag`, `updateTag`)、`next/server`(`connection`)、`next/headers`、`next/font/google`、`@mui/material-nextjs`(`AppRouterCacheProvider`)、`nuqs/adapters/next/app`。
- フレームワーク非依存で流用できるもの: better-auth(`lib/auth.ts`, `lib/auth-client.ts`)、drizzle(`lib/drizzle/*`、`getDb()` は Workers/Node 分岐済み)、画像ストレージ(`lib/utils/image-storage/` の r2/local)、zod スキーマ、各種 utils。
- 環境変数: `NEXT_PUBLIC_*` はクライアントにビルド時インライン。`SITE_NAME`, `SITE_DESCRIPTION`, `THEME_COLOR*` 等はサーバー側。
- テスト: 10 ファイルが `next/navigation` 等を `vi.mock` している。`lib/actions/walk-actions.test.ts` は pglite で実 DB を使う。

## ゴール

- 画面・操作・機能が現状と同一に動く(ルート遷移をまたいで地図が保持される操作感を含む)。
- Cloudflare Workers と Docker(Node)の両方にデプロイできる。
- `next`, `vinext`, `@vinext/cloudflare`, `react-server-dom-webpack`, `@vitejs/plugin-rsc`, `@mui/material-nextjs`, `buffer`/`util` polyfill(不要になれば)を依存から外す。
- `vp check` と `vp test` が通る。

## 非ゴール

- 見た目・機能の変更、新機能の追加。
- DB スキーマ・認証方式(better-auth + Google)の変更。
- SSR によるページ本文の描画(本文はクライアント描画のままでよい)。

## アンチゴール(動いても失敗とみなすもの)

- ルート遷移(一覧 ↔ 詳細 ↔ 編集)のたびに地図が再初期化される。
- `/show/:id` の OGP(SNS シェア時のプレビュー)が出なくなる。
- Workers と Docker のどちらか片方でしか動かない。

## 構成

```
web/
  server/            Hono アプリ(両ランタイム共通)
    app.ts           ルート定義。export type AppType
    routes/api.ts    旧 Server Actions 相当
    routes/pages.ts  SPA シェル返却 + <head> 差し込み、/walk/:id、manifest
    cache/           検索キャッシュのアダプタ(KV / メモリ)
  worker.ts          Workers エントリ
  server.ts          Node エントリ(@hono/node-server)
  src/               クライアント SPA(旧 app/ のコンポーネントを移設)
  index.html         Vite のエントリ HTML
```

ディレクトリ名・ファイル分割の細部はビルダーの裁量。

### サーバー(Hono)

**API(`/api/*`)**: 各 Server Action を Hono のルートにする。zod で入力検証し(`@hono/zod-validator` 等)、クライアントは Hono RPC(`hc<AppType>`)で型付きで呼ぶ。
- 認証が要るルートは middleware で `auth.api.getSession({ headers: c.req.raw.headers })` を引き、`getUid`/`getSelfStatus` 相当を context に載せる。
- `notFound()`/`forbidden()`/`unauthorized()` は HTTP 404/403/401 に置き換え、クライアント側で旧 `not-found`/`forbidden`/`unauthorized` 画面を出す。
- `updateItemAction` は multipart を受ける。画像 2MB 上限の検証メッセージ(「Image size must be 2MB or less」)が今どおり返ること。ボディ上限は 3MB 程度に設定。
- 現在の「エラーを throw せず state の `error` で返す」挙動(検索の limit/offset 範囲外など)は、レスポンス本文の `error` として維持する。RSC 由来の制約で入れていた回避コメントは不要になれば削除。

**認証(`/api/auth/*`)**: `getAuth()` のハンドラをそのままマウント。

**ページ(それ以外の GET)**: ビルド済み `index.html` を返し、`<head>` にサーバーで以下を差し込む。
- 全ページ共通: `<title>`(`%s | SITE_NAME` テンプレート)、`theme-color` メタ、テーマ背景 CSS、`apple-mobile-web-app-*`、manifest リンク
- `/`: `SITE_DESCRIPTION` の description / og
- `/show/:id`: DB から item を取得して title/description/og:image/og:url(取得失敗時はデフォルトのまま返す)
- `/new`, `/edit/:id`: title
- `/walk/:id`: `/show/:id` へ 302(id 不正なら 404)
- `/manifest.webmanifest`: 現 `app/manifest.ts` 相当
- 未知パスも SPA シェルを返し、404 表示はクライアントルーターに任せる(ステータスコードを 404 にするかはビルダーの裁量)

**キャッシュ**: `'use cache'` を廃止し、小さなキャッシュインターフェース(get/set/タグ無効化)を作る。
- Workers: KV(既存の KV namespace バインディングを流用してよい。バインディング名は変えてよい)
- Node: プロセス内メモリ(LRU など)
- 対象: 検索(書き込み/削除時に無効化)、`getCity`、`getUsers`。`getItem` は現状どおりキャッシュしない。
- KV の結果整合性で、更新直後の検索に古い結果が出る可能性は許容する(現 vinext + KV と同等)。

**静的ファイル**: Workers は assets バインディング、Node は `serveStatic`。Node + `IMAGE_STORAGE=local` の `/uploads/*` も Node サーバーが配信する。

### クライアント(Vite + React SPA)

- ルーター: **TanStack Router**(ビルダー判断の候補だったものを設計側で決定)。nuqs は対応アダプタに差し替え。ルート `/`, `/show/$id`, `/new`, `/edit/$id`。地図を含むシェル(`Main`)はルートレイアウトに置き、遷移で再マウントされないこと。
- `next/navigation` / `next/link` をルーターの API に置換。
- Server Action 呼び出しは `hc` クライアント経由に置換。`useActionState` を使い続けるか、素直な state + fetch にするかはビルダーの裁量(`serial`/`isPending` を使う既存のデータフローを壊さないこと)。
- `@mui/material-nextjs` を外し、通常の SPA と同じ MUI 構成にする。
- Roboto は `@fontsource/roboto` 等でセルフホスト(`next/font` の代替)。
- `error.tsx` 相当はルーターのエラー境界で。

### 環境変数

- クライアント向けは名前を変えず `NEXT_PUBLIC_*` のまま、Vite の `envPrefix: 'NEXT_PUBLIC_'` でビルド時インライン(デプロイ設定・README の変更を最小にするため。設計側の判断)。
- `THEME_COLOR*`, `SITE_NAME`, `SITE_DESCRIPTION` はサーバーがリクエスト時に読む(Docker でもビルド時ではなく実行時になる。README と Dockerfile の ARG を更新)。
- Workers では `process.env` の扱い(`nodejs_compat` による populate)が現状どおり使えるか確認し、使えなければ Hono の `c.env` から読む形に寄せる。

### ビルド・デプロイ

- Vite+ と `@cloudflare/vite-plugin` は継続。`vite.config.ts` から vinext を外し、クライアント環境 + Worker 環境の構成にする。
- `cloudflare.config.ts` の entrypoint を `worker.ts` に。`runWorkerFirst` は Server Action 対策の理由が消えるので見直す(アセットは直接配信、ページ・API は Worker)。
- `vp run` タスク(`cf-build`, `cf-dev`, `preview`, `deploy`, `upload`, `cf-typegen`)を維持。`vinext-cloudflare deploy` は `cf`/wrangler のデプロイに置き換え。
- Node 用: クライアントビルド + `server.ts` のバンドル(tsdown など)を作るタスクを追加。`dev` は Vite の dev server で Hono を動かす(`@hono/vite-dev-server` もしくは cloudflare plugin の dev)。
- Dockerfile: Next standalone から、クライアント成果物 + Node サーバーバンドルを `node` で起動する形に書き直す。`docker-compose.yml`(リポジトリルート)の起動コマンドも合わせる。
- `package.json` の `build`/`dev`/`start`/`start-in-docker` を新構成に合わせる。
- CI(`.github/workflows/deploy-cloudflare-workers.yml`, `publish-docker-image.yml`, `ci.yml`)を新しいビルド・デプロイ手順に追従させる。
- 【設計側の判断】既存の不整合を合わせて直す: `docker-compose.yml` は uploads を `/var/www/public/uploads` にマウントしているが、`lib/utils/image-storage/local.ts` はコンテナ内 `/app/public/uploads` に書く。新しい Dockerfile/compose ではこのパスを一致させ、コンテナを作り直しても画像が残るようにする。
- 【設計側の判断】Docker イメージ内での `pnpm migrate`(README 記載だが現 standalone イメージでも動かない)は本移行の範囲外。イメージは軽量なまま(クライアント成果物 + サーバーバンドル)とする。

### セキュリティ

- Server Actions が暗黙に行っていた Origin チェックの代わりに、Hono の `csrf()` middleware を状態変更系 API に掛ける。

### テスト

- 既存コンポーネントテストの `next/navigation` モックをルーター/nuqs 用に置き換える。
- `walk-actions.test.ts`(pglite)は API ルートのテストとして移植し、ロジックのカバー範囲を落とさない。Hono の `app.request()` で叩く形を想定。
- `next` 依存のテストユーティリティは削除。

## 進め方

ブランチ上で一括置換し、最後に一度で切り替える(Next と共存させる段階移行はしない)。作業順の例(詳細は実装計画で決める):

1. Hono サーバー骨格 + API ルート移植(+ テスト)
2. クライアント SPA 化(ルーター、RPC 呼び出し、MUI/フォント)
3. `<head>` 差し込み・OGP・manifest・リダイレクト
4. キャッシュアダプタ
5. Workers / Node のビルド・デプロイ・Dockerfile
6. Next/vinext 依存の削除、README・AGENTS.md の更新

## 完了条件

- `vp check`, `vp test` が通る。
- Workers(`vp run preview` 以上)と Docker の双方で起動し、以下を手動確認:
  ログイン/ログアウト、検索(各フィルタ・ページング)、詳細表示、新規作成(画像あり)、編集、削除、`/walk/:id` リダイレクト、`/show/:id` の OGP メタ、PWA manifest、未承認ユーザーの pending 表示、ルート遷移で地図が保持されること。
- 依存から `next` / vinext 系が消えている。

## ビルダーに任せること

- ディレクトリ構成とファイル分割の細部
- API のパス設計(REST 風か RPC 風か)と HTTP メソッド
- キャッシュキーの設計、メモリキャッシュの実装
- `useActionState` を残すかどうか
- Node サーバーのバンドル手段
- 未知パスの HTTP ステータス
