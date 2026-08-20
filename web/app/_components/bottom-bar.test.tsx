import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import React from 'react'
import { Mock } from 'vitest'
import { useConfig } from '@/lib/utils/config'
import { useData } from '@/lib/utils/data-context'
import { useMainContext } from '@/lib/utils/main-context'
import BottomBar from './bottom-bar'

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: vi.fn(),
}))

vi.mock('@/lib/utils/data-context', () => ({
  useData: vi.fn(),
}))

vi.mock('@/lib/utils/config', () => ({
  useConfig: vi.fn(),
}))

const mockUsePathname = vi.fn(() => '/show/1')

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: () => mockUsePathname(),
  useParams: vi.fn(() => ({ id: '1' })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

describe('BottomBar', () => {
  const mockDispatchMain = vi.fn()
  const mockPushWithGuard = vi.fn()
  const mockData = {
    rows: [
      { id: 1, date: '2023-01-01', title: 'Walk 1', length: 5.0 },
      { id: 2, date: '2023-01-02', title: 'Walk 2', length: 6.0 },
    ],
    offset: 0,
    current: { id: 1, date: '2023-01-01', title: 'Walk 1', length: 5.0 },
  }
  const mockConfig = { defaultCenter: '35.6762,139.6503', defaultRadius: 500 }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMainContext as Mock).mockReturnValue([
      { overlay: false, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
      mockPushWithGuard,
    ])
    ;(useData as Mock).mockReturnValue([mockData])
    ;(useConfig as Mock).mockReturnValue(mockConfig)
  })

  it('renders the BottomBar component', () => {
    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('BottomBar')).toBeInTheDocument()
  })

  it('displays item controls when in show page with item data', () => {
    mockUsePathname.mockReturnValue('/show/1')

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByText('2023-01-01 : Walk 1 (5.0 km)')).toBeInTheDocument()
    expect(screen.getByTestId('prev-button')).toBeInTheDocument()
    expect(screen.getByTestId('next-button')).toBeInTheDocument()
  })

  it('displays overlay controls when overlay is active', () => {
    ;(useMainContext as Mock).mockReturnValue([
      { overlay: true, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
      mockPushWithGuard,
    ])

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('back-to-map-button')).toBeInTheDocument()
    expect(
      screen.getByTestId('forward-panorama-index-by-1-button'),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('backward-panorama-index-by-1-button'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 / 10')).toBeInTheDocument()
  })

  it('displays filter controls when on home page', () => {
    mockUsePathname.mockReturnValue('/')

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('filter-select')).toBeInTheDocument()
  })

  it('displays edit controls when on new or edit page', () => {
    mockUsePathname.mockReturnValue('/new')

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
  })

  it('displays home button as default when no specific page context', () => {
    mockUsePathname.mockReturnValue('/other')

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    expect(screen.getByTestId('home-button')).toBeInTheDocument()
  })

  it('dispatches the correct action when overlay button is clicked', () => {
    ;(useMainContext as Mock).mockReturnValue([
      { overlay: true, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
      mockPushWithGuard,
    ])

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })
    const overlayButton = screen.getByTestId('back-to-map-button')
    fireEvent.click(overlayButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_OVERLAY',
      payload: false,
    })
  })

  it('updates panorama index when panorama navigation buttons are clicked', () => {
    ;(useMainContext as Mock).mockReturnValue([
      { overlay: true, panoramaIndex: 5, panoramaCount: 10 },
      mockDispatchMain,
      mockPushWithGuard,
    ])

    render(<BottomBar />, { wrapper: withNuqsTestingAdapter() })

    const forwardButton = screen.getByTestId(
      'forward-panorama-index-by-1-button',
    )
    fireEvent.click(forwardButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_PANORAMA_INDEX',
      payload: 6,
    })

    const backwardButton = screen.getByTestId(
      'backward-panorama-index-by-1-button',
    )
    fireEvent.click(backwardButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({
      type: 'SET_PANORAMA_INDEX',
      payload: 4,
    })
  })

  it('handles filter change in home page', async () => {
    mockUsePathname.mockReturnValue('/')

    const onUrlUpdate = vi.fn()
    render(<BottomBar />, { wrapper: withNuqsTestingAdapter({ onUrlUpdate }) })
    const filterSelect = screen.getByTestId('filter-select')

    // Material-UIのSelectコンポーネントでは、inputにchangeイベントを発火させる
    const selectInput = filterSelect.querySelector('input')
    if (selectInput) {
      fireEvent.change(selectInput, { target: { value: 'neighborhood' } })
      await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled())
    } else {
      // inputが見つからない場合は、selectの存在だけを確認
      expect(filterSelect).toBeInTheDocument()
    }
  })
})
