import { render, waitFor } from '@testing-library/react'
import { useParams } from 'next/navigation'
import React from 'react'
import { Mock } from 'vitest'
import { getItemAction } from '@/lib/actions/walk-actions'
import { useData } from './data-context'
import ItemFetcher from './item-fetcher'
import { useUserContext } from './user-context'

vi.mock('@/lib/actions/walk-actions', () => ({
  getItemAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}))

vi.mock('./data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('./user-context', () => ({
  useUserContext: vi.fn(),
}))

describe('ItemFetcher', () => {
  const mockSetData = vi.fn()
  const mockUpdateIdToken = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateIdToken.mockResolvedValue(undefined)
    ;(useParams as Mock).mockReturnValue({ id: '5' })
    ;(useData as Mock).mockReturnValue([{ rows: [] }, mockSetData])
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: mockUpdateIdToken,
      idToken: '',
    })
  })

  it('refreshes the id token and re-fetches the item when the token has expired, instead of getting stuck', async () => {
    ;(getItemAction as Mock)
      .mockResolvedValueOnce({ idTokenExpired: true, current: null, serial: 1 })
      .mockResolvedValueOnce({
        idTokenExpired: false,
        current: { id: 5 },
        serial: 2,
      })

    render(<ItemFetcher />)

    await waitFor(() => expect(getItemAction).toHaveBeenCalledTimes(2))
    expect(mockUpdateIdToken).toHaveBeenCalled()
    await waitFor(() =>
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ current: { id: 5 } }),
      ),
    )
  })
})
