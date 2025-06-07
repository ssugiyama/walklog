import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomBar from './bottom-bar'
import { useMainContext } from '../utils/main-context'
import { useMapContext } from '../utils/map-context'
import { useData } from '../utils/data-context'
import { useConfig } from '../utils/config'

jest.mock('../utils/main-context', () => ({
  useMainContext: jest.fn(),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(),
}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/walk/1'),
}))

jest.mock('use-query-params', () => ({
  useQueryParam: jest.fn(() => ['', jest.fn()]),
  StringParam: jest.fn(),
  withDefault: jest.fn((param, defaultValue) => [param, defaultValue]),
  NumberParam: jest.fn(),
}))
// Mock the global google object
beforeAll(() => {
  global.google = {
    maps: {
      Geocoder: jest.fn(() => ({
        geocode: jest.fn((_, callback) => {
          callback([
            {
              results: [
                {
                  formatted_address: 'Mock Address',
                  geometry: { location: { lat: () => 0, lng: () => 0 } },
                },
              ],
            },
          ])
        }),
      })),
    },
  }
})

afterAll(() => {
  delete global.google
})

describe('BottomBar', () => {
  const mockDispatchMain = jest.fn()
  const mockMapContext = { state: { map: true } }
  const mockData = {
    rows: [
      { id: 1, date: '2023-01-01', title: 'Walk 1', length: 5.0 },
      { id: 2, date: '2023-01-02', title: 'Walk 2', length: 6.0 },
    ],
    offset: 0,
    current: { id: 1, date: '2023-01-01', title: 'Walk 1', length: 5.0 },
  }
  const mockConfig = { defaultCenter: [0, 0], defaultRadius: 500 }

  beforeEach(() => {
    jest.clearAllMocks();
    (useMainContext as jest.Mock).mockReturnValue([
      { overlay: false, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
    ]);
    (useMapContext as jest.Mock).mockReturnValue(mockMapContext);
    (useData as jest.Mock).mockReturnValue([mockData]);
    (useConfig as jest.Mock).mockReturnValue(mockConfig)
  })

  it('renders the BottomBar component', () => {
    render(<BottomBar />)
    expect(screen.getByTestId('BottomBar')).toBeInTheDocument()
  })

  it('displays item controls when an item is selected', () => {
    render(<BottomBar />)
    expect(screen.getByText('2023-01-01 : Walk 1 (5.0 km)')).toBeInTheDocument()
  })

  it('enables the "prev" button when there is previous item', () => {
    render(<BottomBar />)
    const prevButton = screen.getByTestId('prev-button')
    expect(prevButton).toBeEnabled()
  })

  it('enables the "next" button when there is a next item', () => {
    render(<BottomBar />)
    const nextButton = screen.getByTestId('next-button')
    expect(nextButton).not.toBeDisabled()
  })

  it('dispatches the correct action when overlay button is clicked', () => {
    (useMainContext as jest.Mock).mockReturnValue([
      { overlay: true, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
    ])
    render(<BottomBar />)
    const overlayButton = screen.getByTestId('back-to-map-button')
    fireEvent.click(overlayButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'SET_OVERLAY', payload: false })
  })

  it('updates panorama index when panorama navigation buttons are clicked', () => {
    (useMainContext as jest.Mock).mockReturnValue([
      { overlay: true, panoramaIndex: 0, panoramaCount: 10 },
      mockDispatchMain,
    ])
    render(<BottomBar />)
    const forwardButton = screen.getByTestId('forward-panorama-index-by-1-button')
    fireEvent.click(forwardButton)
    expect(mockDispatchMain).toHaveBeenCalledWith({ type: 'SET_PANORAMA_INDEX', payload: 1 })
  })

  it('renders filter controls when no item is selected', () => {
    (useData as jest.Mock).mockReturnValue([{ rows: [], offset: 0 }])
    render(<BottomBar />)
    expect(screen.getByTestId('filter-select')).toBeInTheDocument()
  })
})