<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# `null` と `undefined` の使い分け

- デフォルト値・「まだ値がない/未設定」は `undefined` を使う(関数の省略可能な引数・戻り値、まだ読み込まれていないデータなど)。
- システムが明示的に「空」「無効」「該当なし」を表現する場合にのみ `null` を使う(例: 検索しても見つからなかった結果、意図的にクリアされた値)。
- ただしこの規約に従わないライブラリを直接扱うコードは、そのライブラリの規約に従う。該当例: `nuqs`(「未設定」も `null` で表現)、Google Maps JavaScript API(`.setMap(null)` や `MVCObject` の `.set(key, null)` など)、MUI(`anchorEl` など)、React 本体(`useRef` で保持する DOM/ライブラリインスタンスの参照、コンポーネントが「何も描画しない」を表す `return null`)、`next/navigation` の `URLSearchParams` 互換 API(`.get()` が未設定キーに対して `null` を返す)。
