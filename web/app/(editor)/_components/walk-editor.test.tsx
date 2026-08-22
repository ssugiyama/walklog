import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import React from 'react'
import { Mock } from 'vitest'
import { updateItemAction } from '@/lib/actions/walk-actions'
import { useData } from '@/lib/utils/data-context'
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

let selectedFile: File | null = null

let lastFormData: { append: Mock; get: Mock; entries: Mock } | null = null

beforeAll(() => {
  global.FormData = vi.fn().mockImplementation(function () {
    lastFormData = {
      append: vi.fn(),
      get: vi.fn(),
      entries: vi.fn(() => []),
    }
    return lastFormData
  })
})

vi.mock('@/lib/utils/user-context', () => ({
  useUserContext: () => ({
    updateIdToken: mockUpdateIdToken,
    currentUser: { uid: 'test-uid' },
    users: [{ uid: 'test-uid', active: true }],
  }),
}))

vi.mock('@/lib/utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('@/lib/utils/map-context', () => ({
  useMapContext: () => [
    {
      deleteSelectedPath: mockDeleteSelectedPath,
    },
  ],
}))

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: () => [{}, mockDispatchMain, mockInterceptLink],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => mockSearchParams,
  unauthorized: vi.fn(),
  forbidden: vi.fn(),
}))

vi.mock('@/lib/actions/walk-actions', () => ({
  updateItemAction: vi.fn().mockResolvedValue({}),
}))

vi.mock('./image-uploader', () => ({
  default: ({
    onChange,
    onClear,
  }: {
    onChange: (event: { target: { files: File[] } }) => void
    onClear: () => void
  }) => (
    <div>
      <button
        data-testid="mock-select-image"
        onClick={() =>
          onChange({ target: { files: selectedFile ? [selectedFile] : [] } })
        }
      >
        select image
      </button>
      <button data-testid="mock-clear-image" onClick={() => onClear()}>
        clear image
      </button>
    </div>
  ),
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

const defaultWalk = {
  id: '2',
  date: '2023-01-01',
  title: 'Test Walk',
  comment: 'Test comment',
  draft: true,
  path: 'test-path',
  image: null,
}

describe('WalkEditor update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectedFile = null
    lastFormData = null
    ;(useData as Mock).mockReturnValue([
      { current: defaultWalk, rows: [] },
      mockSetData,
    ])
    ;(updateItemAction as Mock).mockResolvedValue({})
  })

  it('renders WalkEditor with default props', () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    expect(screen.getByTestId('WalkEditor')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2023-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Walk')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test comment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'update' })).toBeInTheDocument()
  })

  it('does not disable the submit button when no path is in the URL', () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    expect(screen.getByRole('button', { name: 'update' })).toBeEnabled()
  })

  it('calls interceptLink when cancel button is clicked', () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    const cancelButton = screen.getByText('cancel')
    fireEvent.click(cancelButton)
    expect(mockInterceptLink).toHaveBeenCalled()
  })

  it('submits the form when update button is clicked', async () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    const submitButton = screen.getByTestId('submit-button')

    fireEvent.click(submitButton)
    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
  })

  it('submits an empty path when no path is selected in the URL', async () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
    expect(lastFormData?.append).toHaveBeenCalledWith('path', '')
  })

  it('submits the encoded path from the URL when one is selected', async () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: { path: '_pyxEaktsYbcEqE' },
      }),
    })
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
    expect(lastFormData?.append).toHaveBeenCalledWith('path', '_pyxEaktsYbcEqE')
  })

  it('updates form data when input changes', () => {
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    const titleInput = screen.getByLabelText('title')

    fireEvent.change(titleInput, { target: { value: 'New Title' } })

    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_IS_DIRTY',
      payload: true,
    })
  })

  it('rejects a non-image file without submitting', async () => {
    selectedFile = new File(['x'], 'document.pdf', { type: 'application/pdf' })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() =>
      expect(
        screen.getByText('Image must be an image file'),
      ).toBeInTheDocument(),
    )
    expect(updateItemAction).not.toHaveBeenCalled()
  })

  it('rejects an image over 2MB without submitting', async () => {
    selectedFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() =>
      expect(
        screen.getByText('Image size must be 2MB or less'),
      ).toBeInTheDocument(),
    )
    expect(updateItemAction).not.toHaveBeenCalled()
  })

  it('sends the file directly instead of uploading it client-side', async () => {
    selectedFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
    expect(lastFormData?.append).toHaveBeenCalledWith('image', selectedFile)
  })

  it('navigates to the show page once the save succeeds', async () => {
    ;(updateItemAction as Mock).mockResolvedValue({ serial: 1, id: 2 })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/show/2'))
  })

  it('force-refreshes the id token and retries the submit once when the token has expired', async () => {
    mockUpdateIdToken.mockResolvedValue(undefined)
    ;(updateItemAction as Mock)
      .mockResolvedValueOnce({
        id: null,
        error: null,
        idTokenExpired: true,
        serial: 1,
      })
      .mockResolvedValueOnce({
        id: 2,
        error: null,
        idTokenExpired: false,
        serial: 2,
      })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalledTimes(2))
    expect(mockUpdateIdToken).toHaveBeenCalledWith(true)
  })

  it('stops retrying the submit after one failed refresh attempt, instead of looping forever', async () => {
    mockUpdateIdToken.mockResolvedValue(undefined)
    ;(updateItemAction as Mock)
      .mockResolvedValueOnce({
        id: null,
        error: null,
        idTokenExpired: true,
        serial: 1,
      })
      .mockResolvedValueOnce({
        id: null,
        error: null,
        idTokenExpired: true,
        serial: 2,
      })
      .mockResolvedValueOnce({
        id: null,
        error: null,
        idTokenExpired: true,
        serial: 3,
      })
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(updateItemAction).toHaveBeenCalledTimes(2)
    expect(mockUpdateIdToken).toHaveBeenCalledTimes(1)
  })
})

describe('WalkEditor create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectedFile = null
    lastFormData = null
    ;(useData as Mock).mockReturnValue([
      { current: null, rows: [] },
      mockSetData,
    ])
    ;(updateItemAction as Mock).mockResolvedValue({})
  })

  it('renders WalkEditor with default props', () => {
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    expect(screen.getByTestId('WalkEditor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'create' })).toBeInTheDocument()
  })

  it('disables the submit button when no path has been drawn', () => {
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter(),
    })
    expect(screen.getByRole('button', { name: 'create' })).toBeDisabled()
  })

  it('enables the submit button once a path is present in the URL', () => {
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: { path: '_pyxEaktsYbcEqE' },
      }),
    })
    expect(screen.getByRole('button', { name: 'create' })).toBeEnabled()
  })

  it('does not call the action when the submit button is disabled', () => {
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter(),
    })

    fireEvent.click(screen.getByTestId('submit-button'))
    expect(updateItemAction).not.toHaveBeenCalled()
  })

  it('submits the encoded path once the create button is enabled', async () => {
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: { path: '_pyxEaktsYbcEqE' },
      }),
    })
    const submitButton = screen.getByTestId('submit-button')

    fireEvent.click(submitButton)

    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
    expect(lastFormData?.append).toHaveBeenCalledWith('path', '_pyxEaktsYbcEqE')
    expect(lastFormData?.append).not.toHaveBeenCalledWith(
      'id',
      expect.anything(),
    )
  })
})
