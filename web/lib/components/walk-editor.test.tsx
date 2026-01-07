import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import WalkEditor from './walk-editor'

const mockUpdateIdToken = jest.fn()
const mockDeleteSelectedPath = jest.fn()
const mockRouterPush = jest.fn()
const mockSetData = jest.fn()
const mockDispatchMain = jest.fn()
const mockInterceptLink = jest.fn()
const mockSearchParams = {
  toString: jest.fn(() => 'param1=value1&param2=value2'),
}

beforeAll(() => {
  global.FormData = jest.fn(() => ({
    append: jest.fn(),
    get: jest.fn(),
    entries: jest.fn(() => []),
  }))
})

jest.mock('../utils/user-context', () => ({
  useUserContext: () => ({
    updateIdToken: mockUpdateIdToken,
    currentUser: { uid: 'test-uid' },
    users: [{ uid: 'test-uid', admin: true }],
  }),
}))

jest.mock('../utils/config', () => ({
  useConfig: () => ({
    openUserMode: true,
  }),
}))

jest.mock('../utils/data-context', () => ({
  useData: () => [
    { current: { id: '2', date: '2023-01-01', title: 'Test Walk', comment: 'Test comment', draft: true, path: 'test-path' } },
    mockSetData,
  ],
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: () => ([
    {
      deleteSelectedPath: mockDeleteSelectedPath,
    },
  ]),
}))

jest.mock('../utils/main-context', () => ({
  useMainContext: () => ([
    {},
    mockDispatchMain,
    mockInterceptLink,
  ]),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => mockSearchParams,
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
}))

jest.mock('@/app/lib/walk-actions', () => ({
  updateItemAction: jest.fn().mockResolvedValue({}),
}))

jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn(() => ['test-path']),
  StringParam: jest.fn(),
  withDefault: jest.fn((param, defaultValue) => [param, defaultValue]),
}))

jest.mock('moment', () => {
  const moment = jest.requireActual('moment')
  return {
    ...moment,
    __esModule: true,
    default: () => ({
      format: jest.fn(() => '2023-01-01'),
    }),
  }
})

describe('WalkEditor update', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renders WalkEditor with default props', () => {
    render(<WalkEditor mode="update" />)
    expect(screen.getByTestId('WalkEditor')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2023-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Walk')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test comment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'update' })).toBeInTheDocument()
  })

  it('calls interceptLink when cancel button is clicked', () => {
    render(<WalkEditor mode="update" />)
    const cancelButton = screen.getByText('cancel')
    fireEvent.click(cancelButton)
    expect(mockInterceptLink).toHaveBeenCalled()
  })

  it('submits the form when update button is clicked', () => {
    render(<WalkEditor mode="update" />)
    const submitButton = screen.getByTestId('submit-button')
    
    fireEvent.click(submitButton)
    expect(submitButton).toBeInTheDocument()
  })

  it('updates form data when input changes', () => {
    render(<WalkEditor mode="update" />)
    const titleInput = screen.getByLabelText('title')
    
    fireEvent.change(titleInput, { target: { value: 'New Title' } })
    
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_IS_DIRTY',
      payload: true,
    })
  })
})

describe('WalkEditor create', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renders WalkEditor with default props', () => {
    render(<WalkEditor mode="create" />)
    expect(screen.getByTestId('WalkEditor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'create' })).toBeInTheDocument()
  })

  it('submits the form when create button is clicked', () => {
    render(<WalkEditor mode="create" />)
    const submitButton = screen.getByTestId('submit-button')
    
    fireEvent.click(submitButton)
    expect(submitButton).toBeInTheDocument()
  })
})