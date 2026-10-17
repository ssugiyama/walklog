import { act, render, screen, waitFor } from '@testing-library/react'
import React, { Suspense } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
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
const statuses: (string | undefined)[] = []

const Consumer = () => {
  const { currentUser, selfStatus } = useUserContext()
  statuses.push(selfStatus)
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
    statuses.length = 0
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

  it('renders pending on the first pass even if the session is already cached, so hydration matches the server', () => {
    // The server always renders without a session; if the client's first
    // render used a cached session it would produce different HTML (the
    // avatar <img> in NavBar) and hydration would fail.
    ;(authClient.useSession as Mock).mockReturnValue({
      data: { user: { id: 'u1', name: 'Me', image: null } },
      isPending: false,
    })
    const html = renderToString(
      <UserContextProvider>
        <Consumer />
      </UserContextProvider>,
    )
    expect(html).toContain('pending')
  })

  it('does not mismatch when a consumer inside a Suspense boundary hydrates after the provider has already resolved', async () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: { user: { id: 'u1', name: 'Me', image: null } },
      isPending: false,
    })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let ready = false
    const Late = () => {
      if (!ready) throw gate
      return <Consumer />
    }
    const tree = (
      <UserContextProvider>
        <Suspense fallback={null}>
          <Late />
        </Suspense>
      </UserContextProvider>
    )
    // Server HTML: the consumer renders without a session.
    ready = true
    const html = renderToString(tree)
    ready = false

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors: unknown[] = []
    await act(async () => {
      hydrateRoot(container, tree, {
        onRecoverableError: (e) => errors.push(e),
      })
    })
    // The provider is hydrated and has the session; only now does the
    // suspended consumer hydrate.
    ready = true
    await act(async () => {
      release()
      await gate
    })
    expect(errors).toEqual([])
    document.body.removeChild(container)
  })

  it('keeps selfStatus undefined until the status has been fetched for a signed-in user', async () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: { user: { id: 'u1', name: 'Me', image: null } },
      isPending: false,
    })
    renderProvider()
    await waitFor(() => expect(statuses).toContain('active'))
    // Never 'anonymous' on the way there: that would read as "not approved".
    expect(statuses.slice(0, statuses.indexOf('active'))).not.toContain(
      'anonymous',
    )
  })

  it('resolves selfStatus to anonymous for a signed-out visitor', async () => {
    ;(authClient.useSession as Mock).mockReturnValue({
      data: null,
      isPending: false,
    })
    renderProvider()
    await waitFor(() => expect(statuses).toContain('anonymous'))
  })
})
