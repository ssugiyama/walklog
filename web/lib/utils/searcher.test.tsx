import { render, waitFor } from '@testing-library/react'
import React, { Activity } from 'react'
import { Mock } from 'vitest'
import { searchAction } from '@/lib/actions/walk-actions'
import { useConfig } from './config'
import { useData } from './data-context'
import Searcher from './searcher'
import { useUserContext } from './user-context'

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

// A single stable instance: next/navigation's real useSearchParams returns a
// referentially stable object across re-renders when the URL hasn't changed,
// so the mock must match that or the effect below (which depends on
// `searchParams`) will treat every render as a param change and loop forever.
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
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
    // idToken starts `undefined`: the auth state hasn't resolved yet (mirrors
    // user-context.tsx's real initial value before Firebase's
    // onIdTokenChanged fires for the first time).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: undefined, // auth state not yet resolved
    })

    const { rerender } = render(<Searcher />)

    // Give any effects a chance to run before asserting nothing fired.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(searchAction).not.toHaveBeenCalled()

    // Firebase resolves the already-persisted login in one step: idToken
    // goes straight from `undefined` to the real token, never passing
    // through `null` (which means "resolved: anonymous", a different case).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: 'real-token-1',
    })
    rerender(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1))
  })

  it('dispatches exactly once for a user who is not logged in', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: undefined, // auth state not yet resolved
    })

    const { rerender } = render(<Searcher />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(searchAction).not.toHaveBeenCalled()

    // Firebase resolves to "no user": idToken goes from undefined (unresolved)
    // to `null` (resolved: anonymous).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: null,
    })
    rerender(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(1))
  })
})
