import React from 'react'
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useUserContext } from '../utils/user-context'
import { useData } from '../utils/data-context'
import SearchBox from './search-box'
import '@testing-library/jest-dom/vitest'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key) => (key === 'index' ? '0' : null)),
  })),
}))

vi.mock('../utils/user-context', () => ({
  useUserContext: vi.fn(),
}))

vi.mock('../utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('../utils/map-context', () => ({
  useMapContext: vi.fn(() => ([
    {
      pathManager: {},
    },
  ])),
}))

vi.mock('../utils/config', () => ({
  useConfig: vi.fn(() => ({})),
}))

vi.mock('./search-form', () => {
  return (<div data-testid="search-form">Search Form</div>)
})

describe('SearchBox', () => {
  const mockRouterReplace = vi.fn()

  beforeEach(() => {
    (useRouter as vi.Mock).mockReturnValue({
      replace: mockRouterReplace,
    });

    (useUserContext as vi.Mock).mockReturnValue({
      users: [],
    });

    (useData as vi.Mock).mockReturnValue([
      {
        offset: 0,
        count: 0,
        rows: [],
      },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the SearchBox component', () => {
    render(
      <SearchBox />,
    )
    expect(screen.getByTestId('SearchBox')).toBeInTheDocument()
  })

  it('calls router.replace when index is present in searchParams', () => {
    const mockRows = [{ id: 1, uid: 'user1', date: '2023-01-01', title: 'Test Walk', length: 5 }];
    (useData as vi.Mock).mockReturnValue([
      {
        offset: 0,
        count: 1,
        rows: mockRows,
      },
    ])

    render(<SearchBox />)
    expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('/show/1'))
  })

  it('displays "No results" when count is 0', () => {
    render(<SearchBox />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('displays the correct count when count is greater than 0', () => {
    const mockRows = [{ id: '1', uid: 'user1', date: '2023-01-01', title: 'Test Walk', length: 5 }];
    (useData as vi.Mock).mockReturnValue([
      {
        offset: 0,
        count: 1,
        rows: mockRows,
      },
    ])

    render(<SearchBox />)
    expect(screen.getByText('1 / 1 item')).toBeInTheDocument()
  })
})
