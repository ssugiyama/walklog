import React from 'react'
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useUserContext } from '../utils/user-context'
import { useData } from '../utils/data-context'
import SearchBox from './search-box'
import '@testing-library/jest-dom'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn((key) => (key === 'index' ? '0' : null))
  })),
}))

jest.mock('../utils/user-context', () => ({
  useUserContext: jest.fn(),
}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(() => ([
    {
      pathManager: {},
    },
  ])),
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(() => ({})),
}))


jest.mock('@/lib/components/search-form', () => function SearchForm() {
  return (<div data-testid="search-form">Search Form</div>)
})

describe('SearchBox', () => {
  const mockRouterReplace = jest.fn()

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockRouterReplace,
    });

    (useUserContext as jest.Mock).mockReturnValue({
      users: [],
    });

    (useData as jest.Mock).mockReturnValue([
      {
        offset: 0,
        count: 0,
        rows: [],
      },
    ])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the SearchBox component', () => {
    render(
      <SearchBox />
    )
    expect(screen.getByTestId('SearchBox')).toBeInTheDocument()
  })

  it('calls router.replace when index is present in searchParams', () => {
    const mockRows = [{ id: 1, uid: 'user1', date: '2023-01-01', title: 'Test Walk', distance: 5 }];
    (useData as jest.Mock).mockReturnValue([
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
    (useData as jest.Mock).mockReturnValue([
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