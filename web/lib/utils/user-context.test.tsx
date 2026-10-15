import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { Mock } from 'vite-plus/test'
import { authClient } from '@/lib/auth-client'
import { UserContextProvider, useUserContext } from './user-context'

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: vi.fn() },
}))

vi.mock('@/lib/actions/walk-actions', () => ({
  getUsersAction: vi.fn().mockResolvedValue([]),
  getSelfStatusAction: vi.fn().mockResolvedValue('active'),
}))

const seen: (string | undefined)[] = []

const Consumer = () => {
  const { currentUser } = useUserContext()
  const label =
    currentUser === undefined
      ? 'pending'
      : currentUser === null
        ? 'anonymous'
        : currentUser.uid
  seen.push(label)
  return <div data-testid="state">{label}</div>
}

const renderProvider = () =>
  render(
    <UserContextProvider>
      <Consumer />
    </UserContextProvider>,
  )

describe('UserContextProvider', () => {
  beforeEach(() => {
    seen.length = 0
  })

  it('is pending until the session resolves, then anonymous', async () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: true,
    })
    const { rerender } = renderProvider()
    expect(screen.getByTestId('state')).toHaveTextContent('pending')

    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: false,
    })
    rerender(
      <UserContextProvider>
        <Consumer />
      </UserContextProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('anonymous'),
    )
  })

  it('maps the session user to currentUser', async () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: { user: { id: 'u1', name: 'Me', image: null } },
      isPending: false,
    })
    renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('u1'),
    )
  })

  it('does not go back to pending when better-auth refetches for a signed-out visitor', async () => {
    // better-auth sets isPending=true on every refetch (tab focus, back
    // online) while `data` is still null, i.e. for anonymous visitors.
    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: false,
    })
    const { rerender } = renderProvider()
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('anonymous'),
    )

    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: true,
    })
    rerender(
      <UserContextProvider>
        <Consumer />
      </UserContextProvider>,
    )
    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: false,
    })
    rerender(
      <UserContextProvider>
        <Consumer />
      </UserContextProvider>,
    )

    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
    // After the first resolution, "pending" must never be observed again.
    const firstResolved = seen.indexOf('anonymous')
    expect(seen.slice(firstResolved)).not.toContain('pending')
  })
})
