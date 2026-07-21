import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ToolBox from '@/lib/components/tool-box'
import { MainContextProvider } from '@/lib/utils/main-context'
import { MapContextProvider } from '@/lib/utils/map-context'
import { ConfigProvider } from '@/lib/utils/config'
import { useQueryParam } from 'use-query-params/dist/useQueryParam'
import { Mock } from 'vitest'

// Test configuration
const TEST_TIMEOUT = 10000
vi.setConfig({ testTimeout: TEST_TIMEOUT })

// Mock the Google Maps API
const mockMap = {
  setCenter: vi.fn(),
}

const mockMarker = {
  setMap: vi.fn(),
  set position(pos) {
    this._position = pos
  },
  get position() {
    return this._position
  },
  set map(map) {
    this._map = map
    this.setMap(map)
  },
  get map() {
    return this._map
  },
  _position: null,
  _map: null,
}

const mockGeocoder = {
  geocode: vi.fn(),
}

const mockMapContext = [
  {
    map: mockMap,
    marker: mockMarker,
    pathManager: {
      getEncodedSelection: vi.fn().mockReturnValue('mock_path'),
      get: vi.fn().mockReturnValue(5.5),
      set: vi.fn(),
      startDraw: vi.fn(),
    },
    downloadPath: vi.fn(),
    uploadPath: vi.fn(),
    clearPaths: vi.fn(),
    addPoint: vi.fn(),
  },
]

const mockMainContext = [
  {
    autoGeolocation: false,
    toolBoxOpen: true,
  },
  vi.fn(),
]

const mockConfig = {
  appVersion: '1.0.0',
  googleApiKey: 'mock_api_key',
  mapTypeIds: 'roadmap,hybrid',
}

// Mock the geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 35.6812,
        longitude: 139.7671,
      },
    }),
  ),
}

// Mock the Google Maps libraries
global.google = {
  maps: {
    ...global.google?.maps,
    importLibrary: vi.fn().mockResolvedValue({}),
    Geocoder: vi.fn().mockImplementation(function () { return mockGeocoder }),
    GeocoderStatus: {
      OK: 'OK',
    },
  },
}

// Setup for all tests
beforeEach(() => {
  vi.clearAllMocks()
  // Mock the geolocation API
  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  })
})

vi.mock('@/lib/utils/map-context', () => ({
  useMapContext: vi.fn().mockImplementation(() => mockMapContext),
  MapContextProvider: ({ children }) => <div data-testid="map-provider">{children}</div>,
}))

vi.mock('@/lib/utils/main-context', () => ({
  useMainContext: vi.fn().mockImplementation(() => mockMainContext),
  MainContextProvider: ({ children }) => <div data-testid="main-provider">{children}</div>,
}))

vi.mock('@/lib/utils/config', () => ({
  useConfig: vi.fn().mockImplementation(() => mockConfig),
  ConfigProvider: ({ children }) => <div data-testid="config-provider">{children}</div>,
}))

vi.mock('use-query-params/dist/useQueryParam', () => ({
  useQueryParam: vi.fn(() => ['mock-path', vi.fn()]),
}))

vi.mock('serialize-query-params/dist/withDefault', () => ({
  withDefault: vi.fn((param, _defaultValue) => param),
}))

vi.mock('serialize-query-params/dist/params', () => ({
  StringParam: {},
}))

vi.mock('./confirm-modal', () => ({
  __esModule: true,
  default: ({ open, resolve }) => (
    <div data-testid="confirm-modal" data-open={open}>
      <button onClick={() => resolve?.(true)}>Confirm</button>
    </div>
  ),
  APPEND_PATH_CONFIRM_INFO: {
    title: 'Confirm',
    message: 'Are you sure?',
  },
}))

describe('ToolBox Component', () => {
  it('renders correctly when open', () => {
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    expect(screen.getByText('path')).toBeInTheDocument()
    expect(screen.getByText('move')).toBeInTheDocument()
    expect(screen.getByText('draw')).toBeInTheDocument()
    expect(screen.getByText('clear')).toBeInTheDocument()
    expect(screen.getByText('download')).toBeInTheDocument()
    expect(screen.getByText('upload')).toBeInTheDocument()
    expect(screen.getByText('record')).toBeInTheDocument()
    expect(screen.getByText('5.5km')).toBeInTheDocument()
    expect(screen.getByText('here')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('location...')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('handles current location button click', async () => {
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Click the "here" button to get current location
    fireEvent.click(screen.getByText('here'))

    // Verify the geolocation API was called
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()

    // Wait for the marker to be updated
    await waitFor(() => {
      expect(mockMarker.position).toEqual({
        lat: 35.6812,
        lng: 139.7671,
      })
      expect(mockMarker.map).toBe(mockMap)
      expect(mockMap.setCenter).toHaveBeenCalledWith(mockMarker.position)
    })
  })

  it('handles location search', async () => {
    // Mock successful geocode response
    mockGeocoder.geocode.mockImplementation((request, callback) => {
      callback([
        {
          geometry: {
            location: {
              lat: () => 35.6812,
              lng: () => 139.7671,
            },
          },
        },
      ], 'OK')
    })
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Type a location and press enter
    const locationInput = screen.getByPlaceholderText('location...')
    fireEvent.change(locationInput, { target: { value: 'Tokyo' } })
    fireEvent.keyDown(locationInput, { key: 'Enter', charCode: 13 })

    // Verify the geocoder was called

    await waitFor(() => {
      expect(mockGeocoder.geocode).toHaveBeenCalledWith(
        { address: 'Tokyo' },
        expect.any(Function),
      )
    })

    // Check marker was updated

    expect(mockMarker.position).toEqual({
      lat: 35.6812,
      lng: 139.7671,
    })
    expect(mockMarker.map).toBe(mockMap)
    expect(mockMap.setCenter).toHaveBeenCalledWith(mockMarker.position)
  })

  it('handles toggle record function', async () => {
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Click the record button
    fireEvent.click(screen.getByText('record'))

    // Verify geolocation API was called
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()

    // Verify dispatch was called to update autoGeolocation state
    await waitFor(() => {
      expect(mockMainContext[1]).toHaveBeenCalledWith({
        type: 'SET_AUTO_GEOLOCATION',
        payload: true,
      })
    })
  })

  it('handles draw button click', () => {
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Click the draw button
    fireEvent.click(screen.getByText('draw'))

    // Verify pathManager.set was called with editable=true
    expect(mockMapContext[0].pathManager.startDraw).toHaveBeenCalled()
  })

  it('handles path clearing', () => {
    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Click the clear button
    fireEvent.click(screen.getByText('clear'))

    // Verify clearPaths was called
    expect(mockMapContext[0].clearPaths).toHaveBeenCalled()
  })

  it('disables download buttons when no path is selected', () => {
    // Mock useQueryParam to return null (no selected path)
    (useQueryParam as Mock).mockReturnValueOnce([null, vi.fn()])

    render(
      <ConfigProvider>
        <MainContextProvider>
          <MapContextProvider>
            <ToolBox open={true} />
          </MapContextProvider>
        </MainContextProvider>
      </ConfigProvider>,
    )

    // Check that download buttons are disabled
    // Material-UI ListItemButton renders as a div with role="button"
    const downloadButton = screen.getByText('download').closest('[role="button"]')
    expect(downloadButton).toHaveAttribute('aria-disabled', 'true')
  })
})