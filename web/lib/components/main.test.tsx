import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Mock } from 'vitest'
import Main from '@/lib/components/main'
import { DataProvider, useData } from '@/lib/utils/data-context'
import MainContext from '@/lib/utils/main-context'

const defaultMainState = {
  mode: 'map',
  toolBoxOpened: false,
  message: null,
}

const defaultData = {
  current: null,
  records: [],
}

// Mock dependencies
vi.mock('@/lib/components/nav-bar', () => ({
  default: function MockNavBar() {
    return <div data-testid="nav-bar">Nav Bar</div>
  },
}))

vi.mock('@/lib/components/tool-box', () => ({
  default: function MockToolBox() {
    return <div data-testid="tool-box">Tool Box</div>
  },
}))

vi.mock('@/lib/components/map', () => ({
  default: function MockMap() {
    return <div data-testid="map">Map Component</div>
  },
}))

vi.mock('@/lib/components/bottom-bar', () => ({
  default: function MockBottomBar() {
    return <div data-testid="bottom-bar">Bottom Bar</div>
  },
}))

vi.mock('@/lib/utils/data-context', () => ({
  DataProvider: ({ children }) => (
    <div data-testid="data-provider">{children}</div>
  ),
  useData: vi.fn(() => defaultData),
}))

vi.mock('@/lib/utils/map-context', () => ({
  MapContextProvider: ({ children }) => (
    <div data-testid="map-context-provider">{children}</div>
  ),
}))

vi.mock('use-query-params', () => ({
  QueryParamProvider: ({ children }) => (
    <div data-testid="query-param-provider">{children}</div>
  ),
}))

vi.mock('next-query-params/app', () => ({
  default: ({ children }) => children,
}))

vi.mock('@/lib/utils/config', () => ({
  useConfig: vi.fn(() => ({
    theme: {
      palette: {},
    },
  })),
}))

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
})

// Mock share API
Object.defineProperty(navigator, 'share', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
})

// Wrapper for the component under test
function renderWithProviders(
  ui,
  { mainState = defaultMainState, data = defaultData } = {},
) {
  const dispatchMain = vi.fn()

  ;(useData as Mock).mockReturnValue([data])
  return {
    ...render(
      <DataProvider>
        <MainContext.Provider value={[mainState, dispatchMain]}>
          {ui}
        </MainContext.Provider>
      </DataProvider>,
    ),
    dispatchMain,
  }
}

describe('Main Component', () => {
  test('renders correctly in map mode', () => {
    renderWithProviders(
      <Main>
        <div data-testid="main-children">Test Content</div>
      </Main>,
    )

    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-bar')).toBeInTheDocument()

    // Children should not be visible in map mode
    const childContent = screen.getByTestId('main-children')
    expect(childContent).not.toBeVisible()
  })

  test('renders correctly in content mode', () => {
    renderWithProviders(
      <Main>
        <div data-testid="main-children">Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, mode: 'content' } },
    )

    expect(screen.getByTestId('map')).toBeInTheDocument()
    // Bottom bar should be hidden in content mode
    const bottomBar = screen.getByTestId('bottom-bar')
    expect(bottomBar.parentElement).toHaveStyle('display: none')

    // Children should be visible in content mode
    const childContent = screen.getByTestId('main-children')
    expect(childContent).toBeVisible()
  })

  test('toggle view button switches between map and content mode', () => {
    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
    )

    // Find and click the toggle view button
    const toggleButton = screen.getByLabelText('toggle view')
    fireEvent.click(toggleButton)

    // Should dispatch the TOGGLE_VIEW action
    expect(dispatchMain).toHaveBeenCalledWith({ type: 'TOGGLE_VIEW' })
  })

  test('share button opens share dialog if navigator.share is available', async () => {
    renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
    )

    // Find and click the share button
    const shareButton = screen.getByLabelText('share')
    fireEvent.click(shareButton)

    // Should call navigator.share
    await waitFor(() => {
      expect(navigator.share).toHaveBeenCalled()
    })
  })

  test('share button copies to clipboard if navigator.share is not available', async () => {
    // Temporarily remove navigator.share
    const originalShare = navigator.share
    navigator.share = undefined

    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
    )

    // Find and click the share button
    const shareButton = screen.getByLabelText('share')
    fireEvent.click(shareButton)

    // Should use clipboard API and show notification
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(dispatchMain).toHaveBeenCalledWith({
        type: 'OPEN_SNACKBAR',
        payload: 'copied to clipboard',
      })
    })

    // Restore navigator.share
    navigator.share = originalShare
  })

  test('snackbar closes after a timeout', () => {
    vi.useFakeTimers()
    const { dispatchMain } = renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, message: 'Test message' } },
    )

    // Find the snackbar
    const snackbar = screen.getByText('Test message')
    expect(snackbar).toBeVisible()

    // Simulate the close event
    fireEvent.click(document.body)

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    // Check if the snackbar is removed from the document

    // Should dispatch the CLOSE_SNACKBAR action
    expect(dispatchMain).toHaveBeenCalledWith({ type: 'CLOSE_SNACKBAR' })

    vi.useRealTimers()
  })

  test('toolbox is rendered when toolBoxOpened is true', () => {
    renderWithProviders(
      <Main>
        <div>Test Content</div>
      </Main>,
      { mainState: { ...defaultMainState, toolBoxOpened: true } },
    )

    // Find the toolbox
    const toolbox = screen.getByTestId('tool-box')
    expect(toolbox).toBeInTheDocument()
    // We could also check for style properties here
  })
})
