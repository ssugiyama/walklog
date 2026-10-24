# `null` と `undefined` の使い分け

- デフォルト値・「まだ値がない/未設定」は `undefined` を使う(関数の省略可能な引数・戻り値、まだ読み込まれていないデータなど)。
- システムが明示的に「空」「無効」「該当なし」を表現する場合にのみ `null` を使う(例: 検索しても見つからなかった結果、意図的にクリアされた値)。
- ただしこの規約に従わないライブラリを直接扱うコードは、そのライブラリの規約に従う。該当例: `nuqs`(「未設定」も `null` で表現)、Google Maps JavaScript API(`.setMap(null)` や `MVCObject` の `.set(key, null)` など)、MUI(`anchorEl` など)、React 本体(`useRef` で保持する DOM/ライブラリインスタンスの参照、コンポーネントが「何も描画しない」を表す `return null`)、`next/navigation` の `URLSearchParams` 互換 API(`.get()` が未設定キーに対して `null` を返す)。

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
