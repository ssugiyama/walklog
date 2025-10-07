import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  const expandAccordion = async () => {
    const accordionButton = screen.getByRole('button', { name: /filter & sort/i })
    fireEvent.click(accordionButton)
    // Wait for accordion to expand
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /filter/i })).toBeInTheDocument()
    })
  }

  it('renders the accordion with filter & sort label', () => {
    render(<SearchForm />)
    expect(screen.getByRole('button', { name: /filter & sort/i })).toBeInTheDocument()
  })

  it('renders the filter dropdown with default option when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const filterDropdown = screen.getByRole('combobox', { name: /filter/i })
    expect(filterDropdown).toBeInTheDocument()
    fireEvent.mouseDown(filterDropdown)
    await waitFor(() => {
      expect(screen.getByText('Neighborhood')).toBeInTheDocument()
    })
  })

  it('renders the user dropdown with users from context when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const userDropdown = screen.getByRole('combobox', { name: /user/i })
    expect(userDropdown).toBeInTheDocument()
    fireEvent.mouseDown(userDropdown)
    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
    })
  })

  it('renders the month dropdown with correct options when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const monthDropdown = screen.getByRole('combobox', { name: /month/i })
    expect(monthDropdown).toBeInTheDocument()
    fireEvent.mouseDown(monthDropdown)
    await waitFor(() => {
      expect(screen.getByText('Jan')).toBeInTheDocument()
      expect(screen.getByText('Dec')).toBeInTheDocument()
    })
  })

  it('renders the year dropdown with correct range when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const yearDropdown = screen.getByRole('combobox', { name: /year/i })
    expect(yearDropdown).toBeInTheDocument()
    fireEvent.mouseDown(yearDropdown)
    await waitFor(() => {
      const currentYear = new Date().getFullYear()
      expect(screen.getByText(currentYear.toString())).toBeInTheDocument()
      expect(screen.getByText('1997')).toBeInTheDocument()
    })
  })

  it('renders the order dropdown with default options when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const orderDropdown = screen.getByRole('combobox', { name: /order/i })
    expect(orderDropdown).toBeInTheDocument()
    fireEvent.mouseDown(orderDropdown)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /newest first/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /oldest first/i })).toBeInTheDocument()
    })
  })

  it('renders the limit input with default value when expanded', async () => {
    render(<SearchForm />)
    await expandAccordion()
    const limitInput = screen.getByLabelText(/limit/i)
    expect(limitInput).toBeInTheDocument()
    expect(limitInput).toHaveValue('20')
  })
})