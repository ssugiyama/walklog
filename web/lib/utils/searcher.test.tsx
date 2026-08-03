import { render, waitFor } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import React from 'react'
import { Mock } from 'vitest'
import { searchAction } from '@/lib/actions/walk-actions'
import { useConfig } from './config'
import { useData } from './data-context'
import Searcher from './searcher'
import { useUserContext } from './user-context'

vi.mock('@/lib/actions/walk-actions', () => ({
  searchAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

vi.mock('./config', () => ({
  useConfig: vi.fn(),
}))

vi.mock('./data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('./user-context', () => ({
  useUserContext: vi.fn(),
}))

describe('Searcher', () => {
  const mockSetData = vi.fn()
  const mockUpdateIdToken = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateIdToken.mockResolvedValue(undefined)
    ;(useSearchParams as Mock).mockReturnValue(new URLSearchParams())
    ;(useConfig as Mock).mockReturnValue({ defaultCenter: null })
    ;(useData as Mock).mockReturnValue([
      { rows: [], offset: 0, params: '' },
      mockSetData,
    ])
    ;(useUserContext as Mock).mockReturnValue({
      updateIdToken: mockUpdateIdToken,
      idToken: '',
    })
  })

  it('refreshes the id token and re-runs the search when the token has expired, instead of getting stuck on "Searching..."', async () => {
    ;(searchAction as Mock)
      .mockResolvedValueOnce({
        rows: [],
        count: 0,
        offset: 0,
        idTokenExpired: true,
        index: -1,
        serial: 1,
        append: false,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1 }],
        count: 1,
        offset: 0,
        idTokenExpired: false,
        index: -1,
        serial: 2,
        append: false,
      })

    render(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(2))
    expect(mockUpdateIdToken).toHaveBeenCalled()
    await waitFor(() =>
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ rows: [{ id: 1 }] }),
      ),
    )
  })
})
