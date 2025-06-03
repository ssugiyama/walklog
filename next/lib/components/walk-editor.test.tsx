import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import WalkEditor from './walk-editor'

const mockSetOpened = jest.fn()
const mockUpdateIdToken = jest.fn()
const mockDeleteSelectedPath = jest.fn()
const mockRouterPush = jest.fn()

beforeAll(() => {
  global.FormData = jest.fn(() => ({
    append: jest.fn(),
    get: jest.fn(),
    entries: jest.fn(() => [])
  }))
})

jest.mock('../utils/user-context', () => ({
  useUserContext: () => ({
    updateIdToken: mockUpdateIdToken,
  }),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: () => ([
    {
      deleteSelectedPath: mockDeleteSelectedPath,
    },
  ]),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

jest.mock('@/lib/utils/data-context', () => ({
  useData: () => ({
    reset: jest.fn(),
  }),
}))

jest.mock('@/app/lib/walk-actions', () => ({
  updateItemAction: jest.fn().mockReturnValue(
    {
      serial: 1,
      id: '2',
      error: null,
      idTokenExpired: false,
    }
  ),
}))
jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn(() => ['test-path']),
  StringParam: jest.fn(),
  withDefault: jest.fn((param, defaultValue) => [param, defaultValue]),
}))

describe('WalkEditor update', () => {
  const defaultProps = {
    item: {
      id: '2',
      date: '2023-01-01',
      title: 'Test Walk',
      image: 'test-image.jpg',
      comment: 'Test comment',
      draft: true,
    },
    opened: true,
    setOpened: mockSetOpened,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('renders WalkEditor with default props', () => {
    render(<WalkEditor {...defaultProps} />)
    expect(screen.getByText('Update Walk')).toBeInTheDocument()
    expect(screen.getByLabelText('date')).toHaveValue('2023-01-01')
    expect(screen.getByLabelText('title')).toHaveValue('Test Walk')
    expect(screen.getByLabelText('comment')).toHaveValue('Test comment')
    expect(screen.getByLabelText('draft?')).toBeChecked()
    expect(screen.getByRole('button', { name: 'update' })).toBeInTheDocument()
  })

  it('calls setOpened when cancel button is clicked', () => {
    render(<WalkEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('cancel'))
    expect(mockSetOpened).toHaveBeenCalledWith(false)
  })

  it('submits the form when update button is clicked', () => {

    render(<WalkEditor {...defaultProps} />)
    const form = screen.getByRole('form')
    const submitSpy = jest.spyOn(form, 'requestSubmit')

    fireEvent.click(screen.getByTestId('submit-button'))
    expect(submitSpy).toHaveBeenCalled()
    expect(mockSetOpened).toHaveBeenCalledWith(false)
    expect(mockRouterPush).not.toHaveBeenCalledWith('/walk/2')

  })

  it('resets the form when opened prop changes to true', () => {
    const { rerender } = render(<WalkEditor {...defaultProps} />)
    const form = screen.getByRole('form')
    const resetSpy = jest.spyOn(form, 'reset')
    rerender(<WalkEditor {...defaultProps} />)
    expect(resetSpy).toHaveBeenCalled()
  })
})

describe('WalkEditor create', () => {
  const defaultProps = {
    item: {
      date: '2023-01-01',
      title: 'Test Walk',
      image: 'test-image.jpg',
      comment: 'Test comment',
      draft: true,
    },
    opened: true,
    setOpened: mockSetOpened,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('renders WalkEditor with default props', () => {
    render(<WalkEditor {...defaultProps} />)
    expect(screen.getByText('New Walk')).toBeInTheDocument()
    expect(screen.getByLabelText('date')).toHaveValue('2023-01-01')
    expect(screen.getByLabelText('title')).toHaveValue('Test Walk')
    expect(screen.getByLabelText('comment')).toHaveValue('Test comment')
    expect(screen.getByLabelText('draft?')).toBeChecked()
    expect(screen.getByRole('button', { name: 'create' })).toBeInTheDocument()

  })

  it('submits the form when update button is clicked', () => {

    render(<WalkEditor {...defaultProps} />)
    const form = screen.getByRole('form')
    const submitSpy = jest.spyOn(form, 'requestSubmit')

    fireEvent.click(screen.getByTestId('submit-button'))
    expect(submitSpy).toHaveBeenCalled()
    expect(mockSetOpened).toHaveBeenCalledWith(false)
    expect(mockRouterPush).toHaveBeenCalledWith('/walk/2')

  })

})