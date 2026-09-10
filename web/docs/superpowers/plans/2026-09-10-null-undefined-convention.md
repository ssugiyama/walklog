# Null/Undefined Convention Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the codebase in line with the convention now recorded in `AGENTS.md` — default values use `undefined`; `null` is reserved for a deliberate, meaningful "empty/invalid/not found" — fixing every confirmed violation found in a full `app/`+`lib/` audit, without changing observable behavior.

**Architecture:** No architectural change. This is a type/default-value correctness pass across ~20 files, grouped into independently-testable tasks by risk: pure mechanical renames first (near-zero risk), then state-shape fixes (`GetItemState`/`DataT`/`UpdateItemState`), then the one genuinely load-bearing type fix (`WalkT`/`asWalkT`), then a few real bugs the audit surfaced along the way (dead code, a wrong parameter type), then doc/test-comment fixes.

**Tech Stack:** TypeScript (`strict: false` — most of these mismatches are invisible to `tsc` today, so tests + manual reasoning are the real safety net, not the compiler), Vitest, Next.js 16 Server Actions.

**Spec:** No separate spec doc — this plan is self-contained. The audit that produced every finding below was run against `app/` and `lib/` in full (not just recently-touched files); a condensed version of it is embedded per-task.

## Global Constraints

- No behavior change anywhere in this plan except the two "real bug" fixes called out explicitly in Task 3 (`searchInternalAction`'s `uid` parameter type, `SearchProps.draftUid` removal, `search-box.tsx`'s dead `case null:`) — those are correctness fixes, not new features.
- After every task: `npx vitest run` (full suite) and `npx tsc --noEmit -p .` must both stay green. Run `npx biome check <touched files>` too.
- Do not touch code that interoperates directly with a library/API that itself mandates `null` for "no value" — these are documented exceptions, not violations (see Task 1). Recognized exceptions in this codebase: `nuqs` (named explicitly by the user), the Google Maps JavaScript API (`.setMap(null)`, `MVCObject`-style `.set('selection', null)`, polyline/library idioms in `path-manager.ts`/`map-context.tsx`), MUI (`anchorEl` in `nav-bar.tsx`), React itself (`useRef` for DOM/library-instance handles, and a component's `return null` to render nothing), and `next/navigation`'s `URLSearchParams`-like `.get()` (`search-box.tsx`).
- Several audit findings are intentionally **left as-is** because they're deliberate, meaningful "empty" states, not "not yet set" defaults — do not change these even though they use `null`:
  - `lib/utils/user-context.tsx`: `currentUser`/`idToken` three-state design (`undefined` = not resolved yet, `null` = resolved: signed out, value = resolved: signed in) — this is the reference example for the whole convention.
  - `lib/utils/main-context.tsx` `MainState.message` and `app/(editor)/_components/walk-editor.tsx` `localError` — both are repeatedly toggled open/cleared throughout the component's life, not a one-time "not yet loaded" default.
  - `types.ts` `DataT.nextId`/`prevId` — "no next/previous item exists" is a genuine search-result fact once computed, not a not-yet-set placeholder.
  - `lib/utils/path-manager.ts` `selection`/`current`/`lastClickLatLng`, and its `polylines` map's `WalkT | null` tuple slot (drawn-but-unsaved polyline vs. one backed by a real walk).
  - `lib/utils/config.tsx`'s `use()`-based promise pattern is exempt in Task on the `db.ts`/`firebase-id-token.ts` singletons but the `ConfigContext` default itself is covered in Task 4 (low-impact, but included for consistency).
- `lib/utils/path-manager.ts`'s `draw: TerraDraw | null = null` field (unconditionally overwritten 3 lines later in the same constructor, before any external read) is dead/harmless — skip it, not worth a task.

---

### Task 1: Extend the AGENTS.md exception list beyond nuqs

**Why:** The user's rule names `nuqs` as the only library exception, but the audit found several other places where code directly interoperates with a library/API that itself requires `null` (Google Maps JS API, MUI, React). Leaving the rule text under-scoped would make every future pass over this code re-litigate the same "is this a violation?" question for these libraries.

**Files:**
- Modify: `AGENTS.md` (the section added this session, just below `<!-- END:nextjs-agent-rules -->`)

- [x] **Step 1: Broaden the exception bullet**

Change:
```md
- ただしこの規約に従わないライブラリを直接扱うコードは、そのライブラリの規約に従う(例: `nuqs` は「未設定」も `null` で表現するので、`nuqs` の型・API に触れる箇所ではそちらに合わせる)。
```
to:
```md
- ただしこの規約に従わないライブラリを直接扱うコードは、そのライブラリの規約に従う。該当例: `nuqs`(「未設定」も `null` で表現)、Google Maps JavaScript API(`.setMap(null)` や `MVCObject` の `.set(key, null)` など)、MUI(`anchorEl` など)、React 本体(`useRef` で保持する DOM/ライブラリインスタンスの参照、コンポーネントが「何も描画しない」を表す `return null`)、`next/navigation` の `URLSearchParams` 互換 API(`.get()` が未設定キーに対して `null` を返す)。
```

- [x] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: broaden null/undefined convention's library exception list"
```

---

### Task 2: Real bugs/dead code the audit surfaced (not pure style)

**Why:** Three findings aren't really "which sentinel to use" style questions — they're an actually-wrong parameter type, a genuinely dead field, and genuinely dead code. Fixing them is in scope because the audit that was run specifically to support this convention pass is what found them, but call them out separately so they're reviewable as bug fixes, not renames.

**Files:**
- Modify: `lib/actions/walk-actions.ts` (`searchInternalAction` signature)
- Modify: `types.ts` (`SearchProps.draftUid`)
- Modify: `app/(home)/_components/search-box.tsx` (dead `case null:`)

- [x] **Step 1: Fix `searchInternalAction`'s `uid` parameter type**

`lib/actions/walk-actions.ts` — `searchInternalAction(props: SearchProps, uid: string)` is typed as always-a-string, but it's always called with the result of `getUid()` (`string | null`), and the function body already does `if (uid !== null)` expecting the null case. Change:

```ts
export const searchInternalAction = async (
  props: SearchProps,
  uid: string,
): Promise<SearchState> => {
```
to:
```ts
export const searchInternalAction = async (
  props: SearchProps,
  uid: string | null,
): Promise<SearchState> => {
```

No behavior change (TypeScript-only; `strict: false` means this was never enforced, but the annotation should match reality).

- [x] **Step 2: Remove the dead `SearchProps.draftUid` field**

Confirmed via `grep -rn "draftUid" app lib` — zero references anywhere outside the type declaration itself. In `types.ts`, remove:
```ts
  draftUid?: string | null
```
from `SearchProps`.

- [x] **Step 3: Remove the dead `case null:` in search-box.tsx**

`app/(home)/_components/search-box.tsx` around line 86-87 has:
```tsx
switch (count) {
  case null:
    return <span>successfully saved</span>
  ...
```
`count` comes from `SearchState.count: number` (`types.ts`), which is never `null` or optional — this branch can never execute. Read the surrounding 15 lines first to see the other cases and confirm removing this one case doesn't remove the only path to that "successfully saved" message (if it turns out that message is reachable ONLY via this dead branch, that's a separate, real bug to flag and ask about rather than silently deleting the message) — then delete just the dead `case null:` block if another case already provides equivalent messaging, or ask before proceeding if not.

- [x] **Step 4: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```
Expected: all green, no behavior change.

- [x] **Step 5: Commit**

```bash
git add lib/actions/walk-actions.ts types.ts "app/(home)/_components/search-box.tsx"
git commit -m "fix: correct searchInternalAction's uid type, remove dead draftUid field and unreachable switch case"
```

---

### Task 3: `WalkT`/`asWalkT` — the one load-bearing type fix

**Why:** This is the highest-impact finding: `WalkT.comment: string` and `.date`/`.path` don't match what `asWalkT` (`lib/actions/walk-actions.ts`) actually produces from nullable DB columns, and it's invisible today only because `strict: false` hides it. Every consumer already treats these fields defensively (confirmed by grep — `item.comment &&`, `item?.comment ?? ''`, `image ? [...] : []`), so converting DB `null` to `undefined` at this one mapping boundary and fixing the type to match is behavior-neutral.

**Files:**
- Modify: `types.ts` (`WalkT`)
- Modify: `lib/actions/walk-actions.ts` (`asWalkT`, ~line 60-76)

- [x] **Step 1: Update `WalkT`**

In `types.ts`, change:
```ts
export type WalkT = {
  id: number
  uid: string
  date: string
  title: string
  comment: string
  distance?: number
  length?: number
  path?: Position[]
  image?: string
  draft?: boolean
  stale?: boolean
}
```
to:
```ts
export type WalkT = {
  id: number
  uid: string
  date: string
  title: string
  comment?: string
  distance?: number
  length?: number
  path?: Position[]
  image?: string
  draft?: boolean
  stale?: boolean
}
```
(Only `comment` changes — `date` stays required since the DB column is `NOT NULL`; `path`/`image` were already correctly optional, `asWalkT` just needs to stop assigning `null` into them.)

- [x] **Step 2: Fix `asWalkT`**

In `lib/actions/walk-actions.ts`, change:
```ts
const asWalkT = (
  walk: WalkSelectAttributes,
  includePath: boolean = false,
): WalkT => {
  return {
    id: walk.id,
    date: walk.date ? moment(walk.date).format('YYYY-MM-DD') : null,
    title: walk.title,
    comment: walk.comment,
    draft: walk.draft,
    image: walk.image,
    length: walk.length,
    path: includePath && walk.path ? walk.path : null,
    distance: walk.distance,
    uid: walk.uid,
  }
}
```
to:
```ts
const asWalkT = (
  walk: WalkSelectAttributes,
  includePath: boolean = false,
): WalkT => {
  return {
    id: walk.id,
    // walks.date is NOT NULL - no null case to handle.
    date: moment(walk.date).format('YYYY-MM-DD'),
    title: walk.title,
    comment: walk.comment ?? undefined,
    draft: walk.draft,
    image: walk.image ?? undefined,
    length: walk.length,
    path: includePath && walk.path ? walk.path : undefined,
    distance: walk.distance,
    uid: walk.uid,
  }
}
```

- [x] **Step 3: Run the existing walk-actions test suite**

```bash
npx vitest run lib/actions/walk-actions.test.ts
```
Expected: all passing (these tests already assert on `.comment`/`.image`/`.path`/`.date` via `expect.objectContaining` with real values, not `null`, so nothing here should need test changes — read any failure carefully before patching, since a failure here would mean a test relies on an actual `null` value that this task just removed).

- [x] **Step 4: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 5: Commit**

```bash
git add types.ts lib/actions/walk-actions.ts
git commit -m "fix: stop mapping nullable DB columns to null in asWalkT, matching WalkT's undefined-style optionality"
```

---

### Task 4: `UpdateItemState`/`GetItemState`/`DataT` initial-state defaults

**Why:** `UpdateItemState.id` is already typed `id?: number` (correct, undefined-style) but the implementation assigns `null` in four places. `GetItemState.current`/`DataT.current` are used with two different meanings under one `null` value: a deliberate "found but hidden" result (keep `null`, don't touch) vs. a "haven't fetched yet" initial default (should be `undefined`). Fix only the initial-default usages.

**Files:**
- Modify: `lib/actions/walk-actions.ts` (`updateItemAction`, 3 call sites: `state.id = null` after create/update failure and at the top)
- Modify: `app/(editor)/_components/walk-editor.tsx` (`initialState`)
- Modify: `lib/utils/item-fetcher.tsx` (`initialGetItemState`)
- Modify: `app/show/[id]/page.tsx` (initial `current` default, if present as a literal `null`)
- Modify: `lib/utils/data-context.tsx` (`initialData.current`)
- Modify: `lib/utils/user-context.tsx` (`initialState.currentUser`, the `createContext` fallback only — not the real `useState`, which is already `undefined`)

- [x] **Step 1: `lib/actions/walk-actions.ts` — `state.id = null` → `undefined`**

In `updateItemAction`, there are 3 assignments: `state.id = null` (near the top, right after `state.serial++`), and two more inside the create/update catch blocks (`state.id = null` on failure). Change all three to `state.id = undefined`. Grep first to confirm the exact current line numbers (they shift slightly with each session's edits): `grep -n "state.id = null" lib/actions/walk-actions.ts`.

- [x] **Step 2: `app/(editor)/_components/walk-editor.tsx` — `initialState.id`**

Change:
```ts
const initialState = {
  id: null,
  error: null,
  idTokenExpired: false,
  serial: 0,
}
```
to:
```ts
const initialState = {
  id: undefined,
  error: null,
  idTokenExpired: false,
  serial: 0,
}
```
(`error: null` stays — `BaseState.error?: Error | null` and an error being explicitly absent-and-cleared is the deliberate-empty case, matching the `localError`/`message` reasoning in the Global Constraints; only `id` is the "not produced yet" default here.)

- [x] **Step 3: `lib/utils/item-fetcher.tsx` — `initialGetItemState.current`**

Change:
```ts
const initialGetItemState: GetItemState = {
  idTokenExpired: false,
  current: null,
  serial: 0,
}
```
to:
```ts
const initialGetItemState: GetItemState = {
  idTokenExpired: false,
  serial: 0,
}
```
(Just omit `current` — `GetItemState.current?: WalkT | null` already defaults to `undefined` when omitted, and `getItemAction`'s deliberate `null` for "exists but hidden" still works exactly the same once a real fetch completes.)

- [x] **Step 4: `app/show/[id]/page.tsx` — check for the same pattern**

Read this file's initial state object (grep confirmed a `serial: 0` initializer around line 44 in an earlier session, alongside a possible `current: null`). If it has a `current: null` initializer analogous to Step 3, apply the same fix (omit the key). If it doesn't set `current` at all already, this step is a no-op — don't invent a change.

- [x] **Step 5: `lib/utils/data-context.tsx` — `initialData.current`**

Change:
```ts
const initialData: DataT = {
  isPending: true,
  rows: [],
  current: null,
  ...
```
to omit `current` entirely (same reasoning as Step 3 — `DataT.current` inherits `GetItemState.current?: WalkT | null`, defaults to `undefined`).

- [x] **Step 6: `lib/utils/user-context.tsx` — the `createContext` fallback default**

This one is low-impact (the real `useState(undefined)` already does the right thing; only the never-actually-used `createContext(initialState)` fallback object is inconsistent). Change:
```ts
const initialState: UserContextT = {
  users: [],
  idToken: null,
  currentUser: null,
  ...
```
`currentUser: null` → `currentUser: undefined` (to match the real initial `useState<FirebaseUser | null | undefined>(undefined)` value's "not resolved yet" meaning). Leave `idToken: null` as-is here — unlike `currentUser`, this context-level fallback object's `idToken` is never read before the real Provider's `useState(null)` sets in per current code, and changing it risks conflating with the deliberate "resolved: anonymous" `null` meaning if anyone ever reads the fallback directly. If in doubt, leave `idToken: null` untouched in this fallback object; only change `currentUser`.

- [x] **Step 7: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 8: Commit**

```bash
git add lib/actions/walk-actions.ts "app/(editor)/_components/walk-editor.tsx" lib/utils/item-fetcher.tsx "app/show/[id]/page.tsx" lib/utils/data-context.tsx lib/utils/user-context.tsx
git commit -m "fix: use undefined for not-yet-set defaults in item/update state, keep null for deliberate hidden-item results"
```

---

### Task 5: `walk-actions.ts` local variables (uploadedImage, newImageFile, decodedPath)

**Files:**
- Modify: `lib/actions/walk-actions.ts`

- [x] **Step 1: `uploadedImage`**

Change `let uploadedImage: string | null = null` to `let uploadedImage: string | undefined`. Check every read (`if (uploadedImage) { void _deleteImage(uploadedImage) }`, `props.image = uploadedImage`) — all are truthy checks or plain assignment, unaffected by the change.

- [x] **Step 2: `newImageFile`**

Change `const newImageFile = image instanceof File && image.size > 0 ? image : null` to `... : undefined`. Only ever used in truthy checks (`if (newImageFile)`) and `newImageFile instanceof File` — safe.

- [x] **Step 3: `decodedPath`**

Change `const decodedPath = walkPath ? decode(walkPath) : null` to `... : undefined`. Update the `hasValidPath` check (`!!decodedPath && decodedPath.length >= 2`) if needed — `!!undefined` and `!!null` are both `false`, so no change needed there.

- [x] **Step 4: Run the walk-actions test suite, full suite, type check**

```bash
npx vitest run lib/actions/walk-actions.test.ts && npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 5: Commit**

```bash
git add lib/actions/walk-actions.ts
git commit -m "refactor: use undefined for not-yet-set local variables in updateItemAction"
```

---

### Task 6: Lazy-singleton caches and default parameters

**Files:**
- Modify: `lib/drizzle/db.ts` (`nodeDb`)
- Modify: `lib/utils/firebase-id-token.ts` (`jwks`)
- Modify: `lib/utils/config.tsx` (`ConfigContext` default)
- Modify: `lib/utils/meta-utils.ts` (`params` default parameter, both `idToShowUrl` and `idToEditUrl`)

- [x] **Step 1: `lib/drizzle/db.ts`**

Change `let nodeDb: Db | null = null` to `let nodeDb: Db | undefined`. The lazy-init line (`nodeDb ??= createNodeDb()`) works identically with `undefined`.

- [x] **Step 2: `lib/utils/firebase-id-token.ts`**

Change `let jwks: ... | null = null` to `let jwks: ... | undefined` (same `??=` pattern, no other change needed).

- [x] **Step 3: `lib/utils/config.tsx`**

Change `const ConfigContext = createContext<Promise<ConfigT> | null>(null)` to `createContext<Promise<ConfigT> | undefined>(undefined)`. Check `useConfig()`'s implementation (`use(ConfigContext)` or similar) — if it does a `use()` call on the raw context value, confirm this doesn't unwrap differently for `undefined` vs `null` (React's `use()` on a non-Promise/non-Context-with-null-default should behave the same either way, but read the function before assuming).

- [x] **Step 4: `lib/utils/meta-utils.ts`**

Change both:
```ts
export const idToShowUrl = (
  id: string | number,
  params: URLSearchParams = null,
) => `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (
  id: string | number,
  params: URLSearchParams = null,
) => `/edit/${id}${params ? `?${params.toString()}` : ''}`
```
to:
```ts
export const idToShowUrl = (
  id: string | number,
  params?: URLSearchParams,
) => `/show/${id}${params ? `?${params.toString()}` : ''}`
export const idToEditUrl = (
  id: string | number,
  params?: URLSearchParams,
) => `/edit/${id}${params ? `?${params.toString()}` : ''}`
```
All call sites either omit the argument or pass a real `URLSearchParams` (confirmed by grep in an earlier session) — no call site passes `null` explicitly, so this is a pure signature cleanup.

- [x] **Step 5: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 6: Commit**

```bash
git add lib/drizzle/db.ts lib/utils/firebase-id-token.ts lib/utils/config.tsx lib/utils/meta-utils.ts
git commit -m "refactor: use undefined for lazy-singleton caches and optional URL-builder params"
```

---

### Task 7: Map-related refs and state (`MapState`, refs, constructor defaults)

**Files:**
- Modify: `lib/utils/map-context.tsx` (`MapState` type + `initialState`)
- Modify: `app/_components/map.tsx` (`MapRefs.resizeIntervalID`, and the `resizeIntervalID = null` reset)
- Modify: `app/_components/nav-bar.tsx` (`provider` ref)
- Modify: `app/_components/tool-box.tsx` (`geocoder` ref)
- Modify: `lib/utils/path-manager.ts` and `lib/utils/polygon-manager.ts` (constructor `optOptions` parameter)

- [x] **Step 1: `lib/utils/map-context.tsx`**

`MapState`'s `map`, `pathManager`, `polygonManager`, `elevationInfoWindow`, `pathInfoWindow`, `distanceWidget`, `marker` fields are all typed `X | null` with `initialState` defaulting each to `null`. None of these are ever reset back to `null` after initialization (`app/_components/map.tsx` only ever assigns real instances via `setMapState(...)`). Change each field's type from `X | null` to `X | undefined` (or plain `X?:` if not already optional) and each `initialState` entry from `null` to `undefined`. Read the full file first to get every field — don't rely on the list above being exhaustive.

- [x] **Step 2: `app/_components/map.tsx` — `resizeIntervalID`**

Change `MapRefs.resizeIntervalID?: NodeJS.Timeout | null` to `resizeIntervalID?: NodeJS.Timeout` (matching every other sibling field in `MapRefs`, which are plain optional with no `| null`). Update the reset line (`rc.resizeIntervalID = null` after the timer fires) to `rc.resizeIntervalID = undefined`.

- [x] **Step 3: `app/_components/nav-bar.tsx` — `provider` ref**

Change `useRef<GoogleAuthProvider | null>(null)` to `useRef<GoogleAuthProvider | undefined>(undefined)`. It's created once in a `useEffect` and only ever read via `provider.current` passed straight to `signInWithPopup` — no `=== null` check to update.

- [x] **Step 4: `app/_components/tool-box.tsx` — `geocoder` ref**

Change `useRef<google.maps.Geocoder>(null)` to `useRef<google.maps.Geocoder | undefined>(undefined)`. Created lazily on first geocode call — check that call site uses a truthy/`??=`-style check, not `=== null`, before changing (read the surrounding ~10 lines first).

- [x] **Step 5: `lib/utils/path-manager.ts` and `lib/utils/polygon-manager.ts` constructors**

Both have `constructor(optOptions: PathManagerOptions | null = null)`. Since it already has a default value, the `| null` is redundant — nobody calls `new PathManager(null)` or `new PolygonManager(null)` (confirmed by grep in the audit; re-confirm with `grep -rn "new PathManager\|new PolygonManager" app lib` before changing). Change to `constructor(optOptions: PathManagerOptions = {})` in both files (drop the `| null` entirely — a plain optional with a real default, not a nullable one).

- [x] **Step 6: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 7: Commit**

```bash
git add lib/utils/map-context.tsx "app/_components/map.tsx" "app/_components/nav-bar.tsx" "app/_components/tool-box.tsx" lib/utils/path-manager.ts lib/utils/polygon-manager.ts
git commit -m "refactor: use undefined for not-yet-initialized map/ui refs and constructor defaults"
```

---

### Task 8: New-walk defaults in `walk-editor.tsx`

**Why:** `WalkT.id: number` and `.uid: string` are required, non-nullable fields, but `walk-editor.tsx` builds a placeholder `item` for `mode === 'create'` with `id: null, uid: null` — a clear "doesn't exist yet" default modeled as `null` against a type that doesn't even allow it (invisible only because `strict: false`). Also cleans up `WalkFields.image`'s "not yet loaded" initial default (kept separate from the deliberate "user cleared image" `null` used elsewhere in the same field — see Global Constraints).

**Files:**
- Modify: `app/(editor)/_components/walk-editor.tsx`

- [x] **Step 1: Decide and apply the `id`/`uid` fix**

The placeholder object for a not-yet-saved walk is:
```ts
item = {
  id: null,
  uid: null,
  date: today,
  title: '',
  comment: '',
  image: null,
  draft: true,
}
```
This can't satisfy `WalkT` (`id: number`, `uid: string`) even loosely. Two options — pick based on how `item` is actually consumed downstream in `create` mode (re-read `handleSubmit`, the JSX, and `cancelUrl`'s `mode === 'update' ? idToShowUrl(item.id, ...) : ...` branch, which never touches `item.id` in create mode, and confirm nothing else in create mode reads `item.id`/`item.uid` before this task changes anything):
  - (a) Widen `WalkT` to `id?: number` / `uid?: string` — but this weakens the type for every consumer (`getItemInternalAction`, `asWalkT`, etc.) that legitimately always has a real id/uid once a row exists, just to accommodate this one placeholder use.
  - (b) Give the create-mode placeholder its own narrower type instead of pretending to be a full `WalkT` (e.g. `Omit<WalkT, 'id' | 'uid'> & { id?: number; uid?: string }`, or a dedicated `NewWalkT` type), keeping `WalkT` itself accurate for anything that came from the DB.
  Prefer (b) — it's more precise and doesn't weaken `WalkT` for every other consumer. Implement it, then change `id: null` → omit (or `id: undefined`) and `uid: null` → omit (or `uid: undefined`) to match the "not yet set" convention. If (b) turns out to ripple into `item`'s type declaration (`let item: WalkT`) in a way that's messy, stop and report back rather than forcing it - this is the one spot in the whole plan where the right shape genuinely depends on judgment, not mechanical substitution.

- [x] **Step 2: `image: null` in the same placeholder**

Change to `image: undefined` (or omit) — this is the "no image yet for a walk that doesn't exist yet" default, distinct from the deliberate `changes.image = null` used later in `handleInputChange` for "user explicitly cleared the image"/"no file chosen in this change event" (leave those two `null` usages alone — see Global Constraints and audit finding #39).

- [x] **Step 3: `WalkFields.image` initial `useState`**

Change:
```ts
const [inputs, setInputs] = useState<WalkFields>({
  date: '',
  title: '',
  comment: '',
  image: null,
  ...
```
`image: null` → `image: undefined`. `WalkFields.image: File | string | null` — decide whether to also drop `| null` from the type now that the "not yet loaded" default no longer needs it, but only if the deliberate-clear codepaths (`handleInputChange`'s `will_delete_image`/`image` cases) truly still need `null` specifically rather than `undefined` — re-read `handleInputChange` before touching the type, since that part is intentionally being left alone per Global Constraints and changing the type without changing those call sites would be inconsistent.

- [x] **Step 4: Run the walk-editor test suite, full suite, type check**

```bash
npx vitest run "app/(editor)/_components/walk-editor.test.tsx" && npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 5: Commit**

```bash
git add "app/(editor)/_components/walk-editor.tsx"
git commit -m "fix: use undefined for a not-yet-saved walk's id/uid/image instead of null"
```

---

### Task 9: `panorama-box.tsx` cleanup

**Files:**
- Modify: `app/show/[id]/_components/panorama-box.tsx`

- [x] **Step 1: `PanoramaRefs` unused `| null`**

`panorama?: google.maps.StreetViewPanorama | null` and `streetViewService?: google.maps.StreetViewService | null` are declared with both `?:` and `| null`, but grep confirms neither field is ever assigned `null` anywhere in the file (only ever a real instance, or left `undefined` by omission). Simplify both to plain optional (drop `| null`): `panorama?: google.maps.StreetViewPanorama`, `streetViewService?: google.maps.StreetViewService`.

- [x] **Step 2: Dead `null`-returning branch**

`getPanoramaPointsAndHeadings(path)` has `if (!path) return null` even though its parameter isn't typed as nullable/optional and every call site always passes a real array (confirmed by grep). If the function's return type is otherwise a real array/object (not `| null` already), either remove the dead guard entirely (preferred, since it's unreachable) or, if you want to keep a defensive guard, change it to `return undefined` and add `| undefined` to the return type. Prefer removing the guard - don't add speculative defensive code back for a case that's proven unreachable.

- [x] **Step 3: Run full suite + type check**

```bash
npx vitest run && npx tsc --noEmit -p .
```

- [x] **Step 4: Commit**

```bash
git add "app/show/[id]/_components/panorama-box.tsx"
git commit -m "refactor: drop unused null variants and dead defensive branch in panorama-box"
```

---

### Task 10: Test-file stale comments (comment-only, no behavior change)

**Files:**
- Modify: `lib/utils/searcher.test.tsx`
- Modify: `lib/utils/item-fetcher.test.tsx`

- [x] **Step 1: Fix the stale comment in both files**

Both `lib/utils/searcher.test.tsx` (~line 99-101) and `lib/utils/item-fetcher.test.tsx` (~line 52-54) have this comment on the "already-logged-in" regression test:
```ts
// Firebase resolves the already-persisted login in one step: idToken
// goes straight from `null` to the real token, never passing through
// `''` (which means "resolved: anonymous", a different case).
```
This contradicts the correct comment a few lines above it in the SAME test file (`idToken: undefined, // auth state not yet resolved`) and the correct comment on the sibling "not logged in" test a few lines below (`idToken goes from `undefined` (unresolved) to `null` (resolved: anonymous)`). The actual mock values in the test (`idToken: null` for unresolved, `idToken: 'real-token-1'`/`idToken: ''` for resolved) are already correct — only the prose is wrong. Fix the comment text in both files to:
```ts
// Firebase resolves the already-persisted login in one step: idToken
// goes straight from `undefined` to the real token, never passing
// through `null` (which means "resolved: anonymous", a different case).
```

- [x] **Step 2: Run both test files to confirm no behavior change**

```bash
npx vitest run lib/utils/searcher.test.tsx lib/utils/item-fetcher.test.tsx
```
Expected: unchanged pass count (comment-only edit).

- [x] **Step 3: Commit**

```bash
git add lib/utils/searcher.test.tsx lib/utils/item-fetcher.test.tsx
git commit -m "docs: fix stale null/undefined comment in auth-resolution regression tests"
```

---

## Self-Review

**Spec coverage:** Every "High confidence, clear violation" and "Test-file inconsistency" bucket from the audit maps to a task (1-10). "Intentional exceptions" and "leave as-is, deliberate/meaningful absence" items are enumerated in Global Constraints so no task accidentally touches them. "Borderline / needs your judgment" items (`main-context.tsx` message, `walk-editor.tsx` localError, `nextId`/`prevId`, `path-manager.ts` `lastClickLatLng`/`draw`) are explicitly resolved (kept as `null`, or skipped as harmless-dead) in Global Constraints with reasoning, not silently dropped.

**Placeholder scan:** No TBD/"add appropriate handling". Task 2 Step 3 and Task 8 Step 1 both branch on "read the code first, then decide" rather than a fixed answer — this is intentional: the correct outcome genuinely depends on surrounding code this plan's author couldn't fully unroll without executing it, and each gives concrete criteria for the decision plus an explicit "stop and report back" escape hatch rather than an open-ended TBD.

**Type consistency:** `WalkT.comment` becoming optional (Task 3) is the only type signature change with call-site-visible impact; every consumer identified by grep already treats the field defensively (`&&`, `?.`, `?? ''`), so no other task needs to change alongside it. `UpdateItemState`/`GetItemState`/`DataT` type declarations don't change at all in Task 4 (they were already correctly optional) — only the implementations assigning `null` into them change.
