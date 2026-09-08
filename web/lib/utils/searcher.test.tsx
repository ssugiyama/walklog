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
})
