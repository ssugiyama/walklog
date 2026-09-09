import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { Mock } from 'vitest'
import { getItemAction } from '@/lib/actions/walk-actions'
import { useData } from './data-context'
import ItemFetcher from './item-fetcher'
import { useUserContext } from './user-context'

vi.mock('@/lib/actions/walk-actions', () => ({
  getItemAction: vi.fn(),
}))

vi.mock('./data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('./user-context', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '2' }),
}))

describe('ItemFetcher', () => {
  const mockSetData = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useData as Mock).mockReturnValue([{ rows: [] }, mockSetData])
    ;(getItemAction as Mock).mockResolvedValue({
      current: { id: 2, title: 'Test Walk' },
      serial: 1,
    })
  })

  it('waits for auth state to resolve before dispatching, then dispatches exactly once for an already-logged-in user', async () => {
    // idToken starts `null`: the auth state hasn't resolved yet (mirrors
    // user-context.tsx's real initial value before Firebase's
    // onIdTokenChanged fires for the first time).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: null,
    })

    const { rerender } = render(<ItemFetcher />)

    // Give any effects a chance to run before asserting nothing fired.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getItemAction).not.toHaveBeenCalled()

    // Firebase resolves the already-persisted login in one step: idToken
    // goes straight from `null` to the real token, never passing through
    // `''` (which means "resolved: anonymous", a different case).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: 'real-token-1',
    })
    rerender(<ItemFetcher />)

    await waitFor(() => expect(getItemAction).toHaveBeenCalledTimes(1))
  })

  it('dispatches exactly once for a user who is not logged in', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: null,
    })

    const { rerender } = render(<ItemFetcher />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getItemAction).not.toHaveBeenCalled()

    // Firebase resolves to "no user": idToken goes from `null` (unresolved)
    // to `''` (resolved: anonymous).
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: vi.fn(),
      idToken: '',
    })
    rerender(<ItemFetcher />)

    await waitFor(() => expect(getItemAction).toHaveBeenCalledTimes(1))
  })
})
