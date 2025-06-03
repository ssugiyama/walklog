import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import SearchForm from './search-form'

jest.mock('../utils/config', () => ({
  useConfig: () => ({
    defaultCenter: [0, 0],
  }),
}))

jest.mock('../utils/user-context', () => ({
  useUserContext: () => ({
    users: [
      { uid: '1', displayName: 'User 1' },
      { uid: '2', displayName: 'User 2' },
    ],
  }),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: () => ({
    state: {
      pathManager: {},
    },
  }),
}))

const mockRouterPush = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn((key, defaultValue) => [defaultValue[1], jest.fn()]),
  StringParam: jest.fn(),
  withDefault: jest.fn((param, defaultValue) => [param, defaultValue]),
  NumberParam: jest.fn(),
}))

describe('SearchForm', () => {
  it('renders the filter dropdown with default option', () => {
    render(<SearchForm />)
    const filterDropdown = screen.getByRole('combobox', { name: /filter/i })
    expect(filterDropdown).toBeInTheDocument()
    fireEvent.mouseDown(filterDropdown)
    expect(screen.getByText('Neighborhood')).toBeInTheDocument()
  })

  it('renders the user dropdown with users from context', () => {
    render(<SearchForm />)
    const userDropdown = screen.getByRole('combobox', { name: /user/i })
    expect(userDropdown).toBeInTheDocument()
    fireEvent.mouseDown(userDropdown)
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })

  it('renders the month dropdown with correct options', () => {
    render(<SearchForm />)
    const monthDropdown = screen.getByRole('combobox', { name: /month/i })
    expect(monthDropdown).toBeInTheDocument()
    fireEvent.mouseDown(monthDropdown)
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Dec')).toBeInTheDocument()
  })

  it('renders the year dropdown with correct range', () => {
    render(<SearchForm />)
    const yearDropdown = screen.getByRole('combobox', { name: /year/i })
    expect(yearDropdown).toBeInTheDocument()
    fireEvent.mouseDown(yearDropdown)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(currentYear.toString())).toBeInTheDocument()
    expect(screen.getByText('1997')).toBeInTheDocument()
  })

  it('renders the order dropdown with default options', () => {
    render(<SearchForm />)
    const orderDropdown = screen.getByRole('combobox', { name: /order/i })
    expect(orderDropdown).toBeInTheDocument()
    fireEvent.mouseDown(orderDropdown)
    expect(screen.getByRole('option', { name: /newest first/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /oldest first/i })).toBeInTheDocument()
  })

  it('renders the limit input with default value', () => {
    render(<SearchForm />)
    const limitInput = screen.getByLabelText(/limit/i)
    expect(limitInput).toBeInTheDocument()
    expect(limitInput).toHaveValue('20')
  })


  it('renders the center input with default value', () => {
    render(<SearchForm />)
    const filterDropdown = screen.getByLabelText(/filter/i)
    fireEvent.mouseDown(filterDropdown)
    const citiesOption = screen.getByRole('option', { name: /cities/i })
    expect(citiesOption).toBeInTheDocument()
    fireEvent.click(citiesOption)
    expect(mockRouterPush).toHaveBeenCalled()

  })
})