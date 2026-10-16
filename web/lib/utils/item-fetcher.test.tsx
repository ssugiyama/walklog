import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { Mock } from 'vite-plus/test'
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
    // currentUser starts `undefined`: the session hasn't resolved yet
    // (mirrors user-context.tsx's real initial value).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: undefined, // session not yet resolved
    })

    const { rerender } = render(<ItemFetcher />)

    // Give any effects a chance to run before asserting nothing fired.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getItemAction).not.toHaveBeenCalled()

    // The session resolves the already-persisted login in one step:
    // currentUser goes straight from `undefined` to the real user, never
    // passing through `null` (which means "resolved: anonymous", a
    // different case).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: { uid: 'u1' },
    })
    rerender(<ItemFetcher />)

    await waitFor(() => expect(getItemAction).toHaveBeenCalledTimes(1))
  })

  it('dispatches exactly once for a user who is not logged in', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: undefined, // session not yet resolved
    })

    const { rerender } = render(<ItemFetcher />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getItemAction).not.toHaveBeenCalled()

    // The session resolves to "no user": currentUser goes from `undefined`
    // (unresolved) to `null` (resolved: anonymous).
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: null,
    })
    rerender(<ItemFetcher />)

    await waitFor(() => expect(getItemAction).toHaveBeenCalledTimes(1))
  })

  it('passes getItemState.error through to data', async () => {
    ;(useUserContext as Mock).mockReturnValue({
      currentUser: null,
    })
    ;(getItemAction as Mock).mockResolvedValue({
      error: 'Invalid id.',
      serial: 1,
    })

    render(<ItemFetcher />)

    await waitFor(() =>
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid id.' }),
      ),
    )
  })
})
