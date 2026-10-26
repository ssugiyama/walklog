import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import React, { Activity } from 'react'
import type { Mock } from 'vite-plus/test'
import { updateItemAction } from '@/lib/api/actions'
import { useData } from '@/lib/utils/data-context'
import { HttpError } from '@/server/http-error'
import WalkEditor from './walk-editor'

const mockDeleteSelectedPath = vi.fn()
const mockRouterPush = vi.fn()
const mockSetData = vi.fn()
const mockDispatchMain = vi.fn()
const mockInterceptLink = vi.fn()
let mockPathParam: string | null = null
const mockSearchParams = {
  toString: vi.fn(() => 'param1=value1&param2=value2'),
  get: vi.fn((key: string) => (key === 'path' ? mockPathParam : null)),
}

let selectedFile: File | null = null

type MockFn = ReturnType<typeof vi.fn>
let lastFormData: { append: MockFn; get: MockFn; entries: MockFn } | null = null

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

// `users` (the cached list of active users) is deliberately empty by default:
// the editor must decide access from `selfStatus`, not from that list, which
// is still [] when /new is opened directly.
type MockUserContext = {
  currentUser: { uid: string } | null | undefined
  users: { uid: string; active: boolean }[]
  selfStatus: 'anonymous' | 'pending' | 'active' | undefined
}
const defaultUserContext: MockUserContext = {
  currentUser: { uid: 'test-uid' },
  users: [],
  selfStatus: 'active',
}
let mockUserContext: MockUserContext = defaultUserContext

vi.mock('@/lib/utils/user-context', () => ({
  useUserContext: () => mockUserContext,
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

vi.mock('@/lib/utils/navigation', async () => ({
  Link: (await import('@/lib/utils/mock-link')).MockLink,
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/lib/api/actions', () => ({
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
    mockPathParam = null
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
    // Read via useSearchParams, not nuqs's useQueryState: nuqs broadcasts the
    // raw (unparsed) value passed to any setter for a given URL key to every
    // useQueryState hook subscribed to that same key, regardless of each
    // hook's own parser. map.tsx's useQueryState('path', parseAsPath...) sets
    // this key with an array of google.maps.LatLng instances, which would
    // leak into a same-key useQueryState('path', parseAsString) hook here
    // instead of the encoded string - reproduced in production as a corrupt
    // `path` field (the LatLng array's own toString(), not the polyline
    // encoding). Reading straight from useSearchParams sidesteps that.
    mockPathParam = '_pyxEaktsYbcEqE'
    render(<WalkEditor mode="update" />, {
      wrapper: withNuqsTestingAdapter(),
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

  it('does not redirect again when the page is hidden and re-shown by Activity after a save', async () => {
    ;(updateItemAction as Mock).mockResolvedValue({ serial: 1, id: 2 })
    const { rerender } = render(
      <Activity mode="visible">
        <WalkEditor mode="update" />
      </Activity>,
      { wrapper: withNuqsTestingAdapter() },
    )

    fireEvent.click(screen.getByTestId('submit-button'))
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledTimes(1))

    // Simulate Next.js Cache Components hiding then re-showing the cached
    // /edit/[id] route via React's <Activity> when the user reopens it.
    rerender(
      <Activity mode="hidden">
        <WalkEditor mode="update" />
      </Activity>,
    )
    rerender(
      <Activity mode="visible">
        <WalkEditor mode="update" />
      </Activity>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('WalkEditor')).toBeInTheDocument(),
    )
    expect(mockRouterPush).toHaveBeenCalledTimes(1)
  })
})

describe('WalkEditor create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectedFile = null
    lastFormData = null
    mockPathParam = null
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
    mockPathParam = '_pyxEaktsYbcEqE'
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter(),
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
    mockPathParam = '_pyxEaktsYbcEqE'
    render(<WalkEditor mode="create" />, {
      wrapper: withNuqsTestingAdapter(),
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

describe('WalkEditor access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathParam = null
    ;(useData as Mock).mockReturnValue([
      { current: null, rows: [] },
      mockSetData,
    ])
  })
  afterEach(() => {
    mockUserContext = defaultUserContext
  })

  // Captures what WalkEditor throws so the test can assert on it; in the app
  // the router's error boundary renders it with ErrorView.
  let caught: unknown
  class Boundary extends React.Component<{ children: React.ReactNode }> {
    state = { failed: false }
    static getDerivedStateFromError() {
      return { failed: true }
    }
    componentDidCatch(error: unknown) {
      caught = error
    }
    render() {
      return this.state.failed ? null : this.props.children
    }
  }

  const renderCreate = () => {
    caught = undefined
    return render(
      <Boundary>
        <WalkEditor mode="create" />
      </Boundary>,
      { wrapper: withNuqsTestingAdapter() },
    )
  }

  // React logs errors caught by a boundary; keep the expected ones quiet.
  const quietErrors = () =>
    vi.spyOn(console, 'error').mockImplementation(() => {})

  it('waits without forbidding while the self status is still loading', () => {
    mockUserContext = { ...defaultUserContext, selfStatus: undefined }
    const { container } = renderCreate()
    expect(caught).toBeUndefined()
    expect(container).toBeEmptyDOMElement()
  })

  it('lets an active user in even if the cached users list does not include them yet', () => {
    mockUserContext = { ...defaultUserContext, users: [] }
    renderCreate()
    expect(caught).toBeUndefined()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('forbids a user who is not approved yet', () => {
    const spy = quietErrors()
    mockUserContext = { ...defaultUserContext, selfStatus: 'pending' }
    renderCreate()
    spy.mockRestore()
    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).status).toBe(403)
  })

  it('requires sign-in when there is no current user', () => {
    const spy = quietErrors()
    mockUserContext = { ...defaultUserContext, currentUser: null }
    renderCreate()
    spy.mockRestore()
    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).status).toBe(401)
  })
})
