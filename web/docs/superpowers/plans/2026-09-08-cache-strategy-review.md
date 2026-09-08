# Cache Strategy Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reported bug where search results don't reflect an edit/delete right away, and audit every `'use cache'` / `'use cache: private'` / `'use cache: remote'` site in the app so the caching strategy is deliberate rather than incidental.

**Architecture:** All server-side caching in this app lives in one file, `lib/actions/walk-actions.ts` (Next.js 16.3, `cacheComponents: true`). The root cause of the reported bug is a mismatch between Next's two invalidation primitives: `revalidateTag(tag, 'max')` is stale-while-revalidate (serves old data once more, refreshes in the background), while `updateTag(tag)` is read-your-own-writes (next read is guaranteed fresh) and is only callable from Server Actions — which is exactly what `updateItemAction`/`deleteItemAction` are. Task 1 swaps the primitive. Task 2 locks in, with a test, that the client actually re-requests search data when the user returns to `/` (Next's Cache-Components `<Activity>` preservation could in principle suppress this the same way it did for the two bugs already fixed in `walk-editor.tsx` and `item-box.tsx` this session). Task 3 documents/decides the remaining cache directives so nothing is left as an accidental default.

**Tech Stack:** Next.js 16.3 (Cache Components / `cacheComponents: true`), React 19.2 (`Activity`), Vitest + Testing Library, Drizzle + pglite for action tests.

**Spec:** No separate spec doc — this plan is self-contained; the "Background" section below is the spec.

## Background (read this before starting any task)

Next's three cache directives, confirmed from `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/{use-cache,use-cache-private,use-cache-remote}.md`:

| Directive | Server storage | Scope | Notes |
|---|---|---|---|
| `'use cache'` (bare) | In-memory LRU (per server instance); default profile: stale 5min client / revalidate 15min server / never time-expires | Shared across all users | What `searchInternalAction`, `getCityAction`, `getUsersAction` use today |
| `'use cache: private'` | **Never stored on the server** — browser memory only, doesn't survive reload | Per-client | Only makes sense for content read during rendering (Suspense-deferred), so the client router can hold it; not clearly meaningful when the "read" happens inside an imperative Server Action call, which is how `getUid` uses it today (see Task 3) |
| `'use cache: remote'` | Shared, durable cache handler (Redis/KV etc.), configured via `cacheHandlers` | Shared across all users and instances | Not used anywhere in this codebase; not needed unless a specific hot path needs cross-instance sharing (none currently do — traffic is low and everything already hits Postgres directly) |

Invalidation, from `revalidateTag.md` / `updateTag.md` / `08-caching.md`:

- `revalidateTag(tag, 'max')`: marks the tag stale; **the next visit still gets old content while fresh content loads in the background** ("calling `revalidateTag` will not immediately trigger many revalidations at once"). Fine for content where a delay is acceptable (blog posts, catalogs).
- `updateTag(tag)`: **only callable inside Server Actions**; immediately expires the tag so the *next* read blocks until fresh data is fetched. This is explicitly "designed for read-your-own-writes scenarios, where a user makes a change ... and the UI immediately shows the change, rather than stale data" — the official example is a `createPost` Server Action calling `updateTag('posts')` right before redirecting to show the new post.

`updateItemAction` and `deleteItemAction` in `lib/actions/walk-actions.ts` are Server Actions, and they currently call `revalidateTag(SEARCH_CACHE_TAG, 'max')` after a successful write — the stale-while-revalidate primitive, in a spot that needs read-your-own-writes semantics. That mismatch is the root cause of "編集直後に search 結果が思ったように更新されない".

## Global Constraints

- Follow TDD: write/adjust the failing test before touching implementation code, for every task.
- Don't touch `getItemInternalAction`'s deliberate no-`'use cache'` comment/behavior — that's an unrelated, already-diagnosed workaround for a different Next 16.2.12 bug and is out of scope.
- Don't introduce `'use cache: remote'` anywhere in this pass — no current call site meets the "when remote caching makes sense" bar from the docs (rate-limited upstream, expensive shared computation, etc.); this app talks directly to its own Postgres instance.
- Keep `SEARCH_CACHE_TAG` (`'searchTag'`) as the only search cache tag — do not split it into finer-grained tags in this pass; that's a separate, larger change not requested here.

---

### Task 1: Use `updateTag` instead of `revalidateTag(..., 'max')` for search-cache invalidation after writes

**Files:**
- Modify: `lib/actions/walk-actions.ts:16` (import), `:587` (`updateItemAction`), `:622` (`deleteItemAction`)
- Modify: `lib/actions/walk-actions.test.ts:11-15` (mock), `:61` (import), `:503`, `:531`, `:793` (assertions)

**Interfaces:**
- Consumes: `updateTag` from `next/cache` (confirmed exported: `grep -n updateTag node_modules/next/cache.d.ts` → present).
- Produces: no change to any exported function signature. `updateItemAction`/`deleteItemAction` still return the same state shape.

- [x] **Step 1: Update the failing assertions first**

In `lib/actions/walk-actions.test.ts`, change the mock at the top of the file to include `updateTag`:

```ts
vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
  unstable_cache: (fn) => fn,
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))
```

Change the import (currently `import { revalidateTag } from 'next/cache'` around line 61) to:

```ts
import { revalidateTag, updateTag } from 'next/cache'
```

Change the three assertions from:

```ts
expect(revalidateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG, 'max')
```

to:

```ts
expect(updateTag).toHaveBeenCalledWith(SEARCH_CACHE_TAG)
expect(revalidateTag).not.toHaveBeenCalled()
```

This applies at the three sites: the "should create a new walk if id is not provided" test (~line 503), "should update an existing walk if id is provided" test (~line 531), and "should delete the walk and set deleted to true" test (~line 793).

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/actions/walk-actions.test.ts`
Expected: FAIL — 3 assertions fail because `updateTag` is never called yet (still calling `revalidateTag`).

- [x] **Step 3: Implement the fix**

In `lib/actions/walk-actions.ts`, change the import on line 16 from:

```ts
import { cacheTag, revalidateTag } from 'next/cache'
```

to:

```ts
import { cacheTag, updateTag } from 'next/cache'
```

Change line 587 (end of `updateItemAction`, after the successful DB write) from:

```ts
  revalidateTag(SEARCH_CACHE_TAG, 'max')
  return state
}
```

to:

```ts
  // updateItemAction is a Server Action the user just triggered by saving,
  // so the search results they see next must reflect their own write
  // immediately (read-your-own-writes) rather than serve one more stale
  // render while revalidating in the background.
  updateTag(SEARCH_CACHE_TAG)
  return state
}
```

Change line 622 (end of `deleteItemAction`, same reasoning) from:

```ts
  state.deleted = true
  revalidateTag(SEARCH_CACHE_TAG, 'max')
  return state
```

to:

```ts
  state.deleted = true
  updateTag(SEARCH_CACHE_TAG)
  return state
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/actions/walk-actions.test.ts`
Expected: PASS — all tests green, including the 3 updated assertions.

- [x] **Step 5: Run the full suite and type-check**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: All tests pass, no type errors (`revalidateTag` import removal must not leave a dangling unused import elsewhere — grep confirmed it's only used in this one file).

- [x] **Step 6: Commit**

```bash
git add lib/actions/walk-actions.ts lib/actions/walk-actions.test.ts
git commit -m "fix: invalidate search cache immediately on edit/delete via updateTag

revalidateTag(tag, 'max') is stale-while-revalidate: the user's own next
read after saving could still see the old search results while Next
refreshes the cache in the background. updateTag is Next's documented
read-your-own-writes primitive for Server Actions and expires the tag
immediately, so the very next search read is guaranteed fresh."
```

---

### Task 2: Verify (and, if needed, fix) that returning to `/` after a save actually re-fetches search results

**Why this task exists:** Task 1 fixes the *server-side* cache so the next fetch of `searchInternalAction` is fresh. But the client only sees that fresh data if `Searcher` (`lib/utils/searcher.tsx`) actually calls `dispatchSearch` again when the user navigates back to `/`. With `cacheComponents: true`, Next preserves previously-visited routes off-screen via React's `<Activity>` instead of unmounting them (see `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`) — this is exactly the mechanism that caused the two bugs already fixed this session in `walk-editor.tsx` (stale redirect refired) and `item-box.tsx` (stale delete-retry refired). `Searcher` is mounted directly by `app/(home)/page.tsx` (not a layout), so it is just as subject to Activity preservation as those two components were. This task writes a regression test using the same `<Activity>` mode-toggle technique already used in `walk-editor.test.tsx` and `item-box.test.tsx` to lock in the expected behavior — that returning to `/` re-dispatches the search — and only touches implementation code if the test shows it doesn't.

**Files:**
- Test: `lib/utils/searcher.test.tsx` (create if it doesn't exist yet — check first: `ls lib/utils/searcher.test.tsx`)
- Modify (only if Step 2 shows a failure): `lib/utils/searcher.tsx`

**Interfaces:**
- Consumes: `Searcher` default export from `lib/utils/searcher.tsx`; `searchAction` from `@/lib/actions/walk-actions` (mock it, following the pattern in `app/(editor)/_components/walk-editor.test.tsx`); `React.Activity` from `'react'`.
- Produces: nothing new is exported; this task only adds/adjusts test coverage and (conditionally) the effect in `Searcher`.

- [x] **Step 1: Check whether a test file already exists**

Run: `ls lib/utils/searcher.test.tsx 2>/dev/null || echo "none"`

If a test file exists, read it fully first and follow its existing mocking conventions instead of the scaffold below. If none exists, create it using the pattern below, modeled on `app/(editor)/_components/walk-editor.test.tsx` (same repo, same mocking style for `next/navigation`, `useData`, etc.).

- [x] **Step 2: Write the regression test**

Create `lib/utils/searcher.test.tsx`:

```tsx
import { render, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import React, { Activity } from 'react'
import { Mock } from 'vitest'
import { searchAction } from '@/lib/actions/walk-actions'
import { useData } from './data-context'
import { useConfig } from './config'
import { useUserContext } from './user-context'
import Searcher from './searcher'

vi.mock('@/lib/actions/walk-actions', () => ({
  searchAction: vi.fn(),
}))

vi.mock('./data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('./config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('./user-context', () => ({
  useUserContext: vi.fn(),
}))

describe('Searcher', () => {
  const mockSetData = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useData as Mock).mockReturnValue([
      { rows: [], offset: 0, params: '' },
      mockSetData,
    ])
    ;(useConfig as Mock).mockReturnValue({ defaultCenter: '35,139' })
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: 'token-1',
    })
    ;(searchAction as Mock).mockResolvedValue({
      rows: [],
      count: 0,
      offset: 0,
      serial: 1,
    })
  })

  it('re-dispatches the search when the page is hidden and re-shown by Activity', async () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Searcher />
      </Activity>,
      { wrapper: withNuqsTestingAdapter() },
    )

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1))

    // Simulate Next.js Cache Components hiding then re-showing the cached
    // "/" route via React's <Activity> when the user navigates back to it
    // after editing or deleting an item elsewhere.
    rerender(
      <Activity mode="hidden">
        <Searcher />
      </Activity>,
    )
    rerender(
      <Activity mode="visible">
        <Searcher />
      </Activity>,
    )

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(2))
  })
})
```

- [x] **Step 3: Run the test**

Run: `npx vitest run lib/utils/searcher.test.tsx`

Two outcomes are both informative here — this is a verification step, not a known-failing test:

- **PASS** (searchAction called twice): Activity's hide→show transition re-runs `Searcher`'s effect and re-dispatches the search, same as it does for every other effect in this app (confirmed pattern from `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`: "Effects run on every hide-to-visible transition, not just the initial mount"). No further code change needed — the combination of this behavior and Task 1's server-side fix is sufficient. Skip to Step 5 and commit just the test.
- **FAIL** (searchAction still called once): something in `Searcher` (e.g. a memoized value that survives the Activity cycle unchanged, unlike the plain effect-on-every-show semantics) is suppressing the re-dispatch. Proceed to Step 4.

- [ ] **Step 4 (only if Step 3 failed): Fix `Searcher` to always re-dispatch on becoming visible again** — *skipped: Step 3's test passed, no fix needed.*

Read the failure output first — it will show exactly which condition inside `Searcher`'s effect (`lib/utils/searcher.tsx:66-76`) is short-circuiting the second dispatch (most likely the `watchKeys.every(...)` early-return guard treating the unchanged `searchParams` as "nothing to do"). Do not guess a fix blind; adjust the effect so a hide→show transition always triggers a fresh `dispatchSearch(props)` call (for example, by dispatching unconditionally rather than gating on the offset/limit branch when the transition is a re-show rather than a genuine param change), matching the "Distinguishing first mount from re-show" ref pattern from `preserving-ui-state.md` if the fix needs to tell the two cases apart. Keep the fix minimal — do not restructure the rest of `Searcher`.

- [x] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: All tests pass, including the new `searcher.test.tsx`.

- [x] **Step 6: Commit**

```bash
git add lib/utils/searcher.test.tsx lib/utils/searcher.tsx
git commit -m "test: lock in that returning to / re-fetches search results after Activity preserves the page"
```

(Drop `lib/utils/searcher.tsx` from the `git add` if Step 3 passed without needing Step 4.)

---

### Task 3: Audit the remaining cache directives and record explicit decisions

**Why this task exists:** The user asked for a review of the *overall* caching strategy, not just the one reported bug. This task doesn't change behavior (unless the investigation in Step 1 turns up an actual problem) — it converts implicit defaults into documented, deliberate choices, and flags one directive usage that looks unusual against the documented model.

**Files:**
- Modify: `lib/actions/walk-actions.ts` (comments only, plus the conditional change in Step 1)

- [x] **Step 1: Investigate `getUid`'s `'use cache: private'` usage**

`getUid` (`lib/actions/walk-actions.ts:148-159`) is called directly from inside Server Actions (`searchAction`, `getItemAction`, `updateItemAction`, `deleteItemAction`) — never from a rendered/Suspense-deferred component. Per `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md`, `'use cache: private'` results are "cached only in the browser's memory" via the client router's request-time prefetching of a *rendered* segment — there is no documented behavior for what happens when a private-cache function is called as a plain async function from inside a Server Action's imperative body rather than from JSX rendering.

Two things to check before deciding anything:
1. Run one of the existing action tests with verbose cache logging to see what actually happens: `NEXT_PRIVATE_DEBUG_CACHE=1 npx vitest run lib/actions/walk-actions.test.ts -t "should call getUid"` (adjust the `-t` filter to an existing test name from `describe('searchAction', ...)` if that exact name doesn't match) and read the output for any `Cache` log lines mentioning `getUid`.
2. Check whether the same concurrency-hang class of bug already documented at `lib/actions/walk-actions.ts:395-399` (for bare `'use cache'` on `getItemInternalAction`, tied to a specific Next 16.2.12 bug) has any bearing on `'use cache: private'` too — search the installed Next.js changelog/issue references under `node_modules/next/dist/docs` for anything more recent (`grep -rn "private" node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`).

If this investigation shows `'use cache: private'` is inert here (i.e., provides no measurable caching benefit because it never runs inside a rendered/Suspense-deferred scope), remove the directive from `getUid` and add a comment explaining why it's plain code now. If it shows real risk (e.g. the same hang class as the known bug), treat that as a separate bug to fix, not something to bundle into this cosmetic pass — stop and report back instead of guessing at a fix. If neither — it works fine, just provides no benefit either way — leave it as-is but add a one-line comment noting it was verified rather than assumed.

- [x] **Step 2: Document the untagged `'use cache'` on `getCityAction` and `getUsersAction`**

Both (`lib/actions/walk-actions.ts:626-641` and `:643-653`) use bare `'use cache'` with no `cacheTag`, meaning they can only ever go stale by time (default profile: 15 minutes server-side), never by on-demand invalidation. Confirmed by grep that no action in this codebase currently mutates the `areas` table or `users.active`, so there is no write path that should be invalidating these — this is a correct, if implicit, choice today. Add a one-line comment above each directing a future author to add a `cacheTag` + `updateTag`/`revalidateTag` pair the moment a write path to that table appears (e.g., a future user-approval action would need to tag and invalidate `getUsersAction`'s cache).

Also confirmed (grep on both call sites — `lib/utils/user-context.tsx:77` and `app/_components/map.tsx:221,434`, both inside `'use client'` files, invoked from `useEffect`/click handlers): neither function is ever called from a Server Component's render tree, so per `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` ("How rendering works" — build-time static-shell inclusion only applies to `'use cache'` code reachable from a route's rendered component tree) these two are **not** baked in at `next build` time; they populate lazily, at runtime, in whichever server instance handles the first real invocation. The correctness caveat is different: per the same doc's "Passing runtime values to cached functions" section, bare `'use cache'` stores entries in-memory **per server instance**. With multiple replicas each instance holds its own independent cache, so results can briefly diverge between replicas until each independently repopulates — not a build-time staleness risk, but an instance-level one. Note this distinction in the added comments (in-memory/per-instance, not a build-time snapshot) so a future reader doesn't reintroduce the build-time misconception.

- [x] **Step 3: Run the full suite once more**

Run: `npx vitest run && npx tsc --noEmit -p .`
Expected: All green — this task should not change any behavior unless Step 1's investigation found a real problem.

- [x] **Step 4: Commit**

```bash
git add lib/actions/walk-actions.ts
git commit -m "docs: record deliberate decisions for the remaining cache directives"
```

---

## Self-Review

**Spec coverage:** Every row of the directive comparison table in Background maps to a task — `use cache` (Task 3 Step 2), `use cache: private` (Task 3 Step 1), `use cache: remote` (Background — explicitly decided against introducing it, no task needed), `revalidateTag`/`updateTag` mismatch (Task 1), client-side re-fetch on Activity re-show (Task 2).

**Placeholder scan:** No TBD/"add appropriate handling"/etc. Task 3 Step 1 intentionally branches on an investigation result because the correct fix genuinely depends on what that investigation finds — the plan states the concrete action for each of the three possible outcomes rather than leaving it open-ended.

**Type consistency:** `updateTag` signature (`updateTag(tag: string): void`) matches how it's called in Task 1 (`updateTag(SEARCH_CACHE_TAG)`, a string constant already defined at `lib/actions/walk-actions.ts:85`). No new exported types introduced.
