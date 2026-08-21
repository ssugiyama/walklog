import { render, waitFor } from '@testing-library/react'
import { getAuth } from 'firebase/auth'
import React from 'react'
import { Mock } from 'vitest'
import {
  clearIdTokenAction,
  getSelfStatusAction,
  getUsersAction,
  setIdTokenAction,
} from '@/lib/actions/walk-actions'
import { UserContextProvider, useUserContext } from './user-context'

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}))

vi.mock('@/lib/actions/walk-actions', () => ({
  clearIdTokenAction: vi.fn(),
  getSelfStatusAction: vi.fn().mockResolvedValue('anonymous'),
  getUsersAction: vi.fn().mockResolvedValue([]),
  setIdTokenAction: vi.fn().mockResolvedValue({ error: false }),
}))

let capturedUpdateIdToken: (forceRefresh?: boolean) => Promise<void>

function Probe() {
  const { updateIdToken } = useUserContext()
  capturedUpdateIdToken = updateIdToken
  return null
}

describe('updateIdToken', () => {
  const mockGetIdToken = vi.fn().mockResolvedValue('a-token')

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetIdToken.mockResolvedValue('a-token')
    ;(getAuth as Mock).mockReturnValue({
      currentUser: { getIdToken: mockGetIdToken },
    })
    ;(setIdTokenAction as Mock).mockResolvedValue({ error: false })
    ;(getSelfStatusAction as Mock).mockResolvedValue('anonymous')
  })

  it('does not force a refresh by default', async () => {
    render(
      <UserContextProvider>
        <Probe />
      </UserContextProvider>,
    )
    await waitFor(() => expect(capturedUpdateIdToken).toBeDefined())

    await capturedUpdateIdToken()

    expect(mockGetIdToken).toHaveBeenCalledWith(false)
  })

  it('forces a token refresh when called with forceRefresh=true, instead of resending a possibly-stale cached token', async () => {
    render(
      <UserContextProvider>
        <Probe />
      </UserContextProvider>,
    )
    await waitFor(() => expect(capturedUpdateIdToken).toBeDefined())

    await capturedUpdateIdToken(true)

    expect(mockGetIdToken).toHaveBeenCalledWith(true)
  })
})
