import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { Mock } from 'vitest'
import { updateItemAction } from '@/app/lib/walk-actions'
import { deleteImage, uploadImage } from '@/lib/utils/firebase-storage'
import { useData } from '../utils/data-context'
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
    imagePrefix: 'images',
  }),
}))

vi.mock('../utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('../utils/map-context', () => ({
  useMapContext: () => [
    {
      deleteSelectedPath: mockDeleteSelectedPath,
    },
  ],
}))

vi.mock('../utils/main-context', () => ({
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

vi.mock('@/app/lib/walk-actions', () => ({
  updateItemAction: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/utils/firebase-storage', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
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

  it('rejects a non-image file without uploading', async () => {
    selectedFile = new File(['x'], 'document.pdf', { type: 'application/pdf' })
    render(<WalkEditor mode="update" />)

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() =>
      expect(
        screen.getByText('Image must be an image file'),
      ).toBeInTheDocument(),
    )
    expect(uploadImage).not.toHaveBeenCalled()
    expect(updateItemAction).not.toHaveBeenCalled()
  })

  it('rejects an image over 2MB without uploading', async () => {
    selectedFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    })
    render(<WalkEditor mode="update" />)

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() =>
      expect(
        screen.getByText('Image size must be 2MB or less'),
      ).toBeInTheDocument(),
    )
    expect(uploadImage).not.toHaveBeenCalled()
    expect(updateItemAction).not.toHaveBeenCalled()
  })

  it('uploads a valid image and sends its URL instead of the file', async () => {
    selectedFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const uploadedUrl = 'https://firebasestorage.googleapis.com/x/photo.jpg'
    ;(uploadImage as Mock).mockResolvedValue(uploadedUrl)
    render(<WalkEditor mode="update" />)

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(updateItemAction).toHaveBeenCalled())
    expect(uploadImage).toHaveBeenCalledWith(
      selectedFile,
      expect.stringContaining('test-uid'),
    )
    expect(lastFormData?.append).toHaveBeenCalledWith('image', uploadedUrl)
  })

  it('deletes the newly uploaded image if the save fails', async () => {
    selectedFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const uploadedUrl = 'https://firebasestorage.googleapis.com/x/photo.jpg'
    ;(uploadImage as Mock).mockResolvedValue(uploadedUrl)
    ;(updateItemAction as Mock).mockResolvedValue({
      serial: 1,
      error: new Error('save failed'),
      id: null,
    })
    render(<WalkEditor mode="update" />)

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(deleteImage).toHaveBeenCalledWith(uploadedUrl))
  })

  it('deletes the old image once a replacement save succeeds', async () => {
    const oldUrl = 'https://firebasestorage.googleapis.com/x/old.jpg'
    ;(useData as Mock).mockReturnValue([
      { current: { ...defaultWalk, image: oldUrl }, rows: [] },
      mockSetData,
    ])
    selectedFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const uploadedUrl = 'https://firebasestorage.googleapis.com/x/photo.jpg'
    ;(uploadImage as Mock).mockResolvedValue(uploadedUrl)
    ;(updateItemAction as Mock).mockResolvedValue({ serial: 1, id: 2 })
    render(<WalkEditor mode="update" />)

    fireEvent.click(screen.getByTestId('mock-select-image'))
    fireEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(deleteImage).toHaveBeenCalledWith(oldUrl))
    expect(mockRouterPush).toHaveBeenCalledWith('/show/2')
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
