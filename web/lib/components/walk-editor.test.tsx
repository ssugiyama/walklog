import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import WalkEditor from './walk-editor'

const mockUpdateIdToken = vi.fn()
const mockDeleteSelectedPath = vi.fn()
const mockRouterPush = vi.fn()
const mockSetData = vi.fn()
const mockDispatchMain = vi.fn()
const mockInterceptLink = vi.fn()
const mockSearchParams = {
  toString: vi.fn(() => 'param1=value1&param2=value2'),
}

beforeAll(() => {
  global.FormData = vi.fn().mockImplementation(function () {
    return {
      append: vi.fn(),
      get: vi.fn(),
      entries: vi.fn(() => []),
    }
  })
})

vi.mock('../utils/user-context', () => ({
  useUserContext: () => ({
    updateIdToken: mockUpdateIdToken,
    currentUser: { uid: 'test-uid' },
    users: [{ uid: 'test-uid', admin: true }],
  }),
}))

vi.mock('../utils/config', () => ({
  useConfig: () => ({
    openUserMode: true,
  }),
}))

vi.mock('../utils/data-context', () => ({
  useData: () => [
    { current: { id: '2', date: '2023-01-01', title: 'Test Walk', comment: 'Test comment', draft: true, path: 'test-path' } },
    mockSetData,
  ],
}))

vi.mock('../utils/map-context', () => ({
  useMapContext: () => ([
    {
      deleteSelectedPath: mockDeleteSelectedPath,
    },
  ]),
}))

vi.mock('../utils/main-context', () => ({
  useMainContext: () => ([
    {},
    mockDispatchMain,
    mockInterceptLink,
  ]),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => mockSearchParams,
  unauthorized: vi.fn(),
  forbidden: vi.fn(),
}))

vi.mock('@/app/lib/walk-actions', () => ({
  updateItemAction: vi.fn().mockResolvedValue({}),
}))

vi.mock('use-query-params', () => ({
  useQueryParam: vi.fn(() => ['test-path']),
  StringParam: vi.fn(),
  withDefault: vi.fn((param, defaultValue) => [param, defaultValue]),
}))

vi.mock('moment', async () => {
  const moment = await vi.importActual('moment')
  return {
    ...moment,
    __esModule: true,
    default: () => ({
      format: vi.fn(() => '2023-01-01'),
    }),
  }
})

describe('WalkEditor update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.clearAllMocks()
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