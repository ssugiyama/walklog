import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import Main from '@/lib/components/main'
import MainContext from '@/lib/utils/main-context'
import { DataProvider, useData } from '@/lib/utils/data-context'

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
jest.mock('@/lib/components/nav-bar', () => function MockNavBar() {
  return <div data-testid="nav-bar">Nav Bar</div>
})

jest.mock('@/lib/components/tool-box', () => function MockToolBox() {
  return <div data-testid="tool-box">Tool Box</div>
})

jest.mock('@/lib/components/map', () => function MockMap() {
  return <div data-testid="map">Map Component</div>
})

jest.mock('@/lib/components/bottom-bar', () => function MockBottomBar() {
  return <div data-testid="bottom-bar">Bottom Bar</div>
})

jest.mock('@/lib/utils/data-context', () => ({
  DataProvider: ({ children }) => <div data-testid="data-provider">{children}</div>,
  useData: jest.fn(() => defaultData),
}))

jest.mock('@/lib/utils/map-context', () => ({
  MapContextProvider: ({ children }) => <div data-testid="map-context-provider">{children}</div>,
}))

jest.mock('use-query-params', () => ({
  QueryParamProvider: ({ children }) => <div data-testid="query-param-provider">{children}</div>,
}))

jest.mock('next-query-params/app', () => ({}))

jest.mock('@/lib/utils/config', () => ({
  useConfig: jest.fn(() => ({
    theme: {
      palette: {},
    },
  })),
})) 

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockImplementation(async () => Promise.resolve()),
  },
  writable: true,
})

// Mock share API
Object.defineProperty(navigator, 'share', {
  value: jest.fn().mockImplementation(async () => Promise.resolve()),
  writable: true,
})

// Wrapper for the component under test
function renderWithProviders(ui, { mainState = defaultMainState, data = defaultData } = {}) {
  const dispatchMain = jest.fn();

  (useData as jest.Mock).mockReturnValue([data])
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
    jest.useFakeTimers()
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
      jest.advanceTimersByTime(8000)
    })

    // Check if the snackbar is removed from the document

    // Should dispatch the CLOSE_SNACKBAR action
    expect(dispatchMain).toHaveBeenCalledWith({ type: 'CLOSE_SNACKBAR' })

    jest.useRealTimers()
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