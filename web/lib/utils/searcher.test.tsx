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

const expiredResult = (serial: number) => ({
  rows: [],
  count: 0,
  offset: 0,
  idTokenExpired: true,
  index: -1,
  serial,
  append: false,
})

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

  it('force-refreshes the id token and re-runs the search once when the token has expired, instead of getting stuck on "Searching..."', async () => {
    ;(searchAction as Mock)
      .mockResolvedValueOnce(expiredResult(1))
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
    expect(mockUpdateIdToken).toHaveBeenCalledWith(true)
    await waitFor(() =>
      expect(mockSetData).toHaveBeenCalledWith(
        expect.objectContaining({ rows: [{ id: 1 }] }),
      ),
    )
  })

  it('stops retrying after one failed refresh attempt, instead of looping the search action forever', async () => {
    ;(searchAction as Mock)
      .mockResolvedValueOnce(expiredResult(1))
      .mockResolvedValueOnce(expiredResult(2))
      .mockResolvedValueOnce(expiredResult(3))

    render(<Searcher />)

    await waitFor(() => expect(searchAction).toHaveBeenCalledTimes(2))
    // Give any runaway retry loop a chance to fire before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(searchAction).toHaveBeenCalledTimes(2)
    expect(mockUpdateIdToken).toHaveBeenCalledTimes(1)
  })
})
