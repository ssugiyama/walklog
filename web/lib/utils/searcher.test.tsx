import { render, waitFor } from '@testing-library/react'
import React, { Activity } from 'react'
import { Mock } from 'vite-plus/test'
import { searchAction } from '@/lib/api/actions'
import { useConfig } from './config'
import { useData } from './data-context'
import Searcher from './searcher'
import { useUserContext } from './user-context'

vi.mock('@/lib/api/actions', () => ({
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

// A single stable instance: next/navigation's real useSearchParams returns a
// referentially stable object across re-renders when the URL hasn't changed,
// so the mock must match that or the effect below (which depends on
// `searchParams`) will treat every render as a param change and loop forever.
const mockSearchParams = new URLSearchParams()

vi.mock('@/lib/utils/navigation', () => ({
  useSearchParams: () => mockSearchParams,
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
      currentUser: { uid: 'u1' },
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

  it('waits for auth state to resolve before dispatching, then dispatches exactly once for an already-logged-in user', async () => {
    // currentUser starts `undefined`: the session hasn't resolved yet
    // (mirrors user-context.tsx's real initial value).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: undefined, // session not yet resolved
    })

    const { rerender } = render(<Searcher />)

    // Give any effects a chance to run before asserting nothing fired.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(searchAction).not.toHaveBeenCalled()

    // The session resolves the already-persisted login in one step:
    // currentUser goes straight from `undefined` to the real user, never
    // passing through `null` (which means "resolved: anonymous", a
    // different case).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: { uid: 'u1' },
    })
    rerender(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1))
  })

  it('dispatches exactly once for a user who is not logged in', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: undefined, // session not yet resolved
    })

    const { rerender } = render(<Searcher />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(searchAction).not.toHaveBeenCalled()

    // The session resolves to "no user": currentUser goes from `undefined`
    // (unresolved) to `null` (resolved: anonymous).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: null,
    })
    rerender(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1))
  })

  it('passes searchState.error through to data instead of merging it as a new page of rows', async () => {
    const error = 'Invalid limit: 500.'
    ;(searchAction as Mock).mockResolvedValue({
      rows: [{ id: 1, title: 'Stale row' }],
      count: 1,
      offset: 0,
      serial: 1,
      append: true,
      error,
    })

    render(<Searcher />)

    await waitFor(() =>
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ error }),
      ),
    )
    // The append merge (unshifting the current rows onto themselves) is
    // skipped on error, since searchState.rows here is just the stale
    // previous page carried through unchanged, not a new one to prepend.
    expect(mockSetData.mock.calls[0][0].rows).toEqual([
      { id: 1, title: 'Stale row' },
    ])
  })
})
