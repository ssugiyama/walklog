import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ElevationBox from './elevation-box'
import { useConfig } from '../utils/config'
import { useData } from '../utils/data-context'
import { useMapContext } from '../utils/map-context'
import { initialize } from '@googlemaps/jest-mocks'

// Rechartsのモック
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

jest.mock('../utils/config', () => ({
  useConfig: jest.fn(),
}))

jest.mock('../utils/data-context', () => ({
  useData: jest.fn(),
}))

jest.mock('../utils/map-context', () => ({
  useMapContext: jest.fn(),
}))

describe('ElevationBox', () => {
  const mockElevationService = {
    getElevationAlongPath: jest.fn(),
  }

  beforeEach(() => {
    initialize()
    global.google = {
      ...global.google,
      maps: {
        ...global.google.maps,
        geometry: {
          encoding: {
            decodePath: jest.fn(() => [{ lat: 35.6762, lng: 139.6503 }]),
          },
        },
        ElevationService: jest.fn(() => mockElevationService),
        ElevationStatus: {
          OK: 'OK',
        },
        LatLng: jest.fn((lat, lng) => ({ lat: () => lat, lng: () => lng })),
      },
    }
    jest.clearAllMocks()
  })

  it('renders null when no selectedItem is present', () => {
    (useData as jest.Mock).mockReturnValue([{ current: null }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: null }])

    const { container } = render(<ElevationBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when selectedItem is present but no chartData', () => {
    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }]);
    (useConfig as jest.Mock).mockReturnValue({ shapeStyles: { polylines: { current: { strokeColor: '#000000' } } } })

    const { container } = render(<ElevationBox />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the elevation box with Recharts components', async () => {
    // モックで標高データを返すように設定
    mockElevationService.getElevationAlongPath.mockImplementation((request, callback) => {
      const results = [
        { elevation: 100, location: { lat: () => 35.6762, lng: () => 139.6503 } },
        { elevation: 110, location: { lat: () => 35.6763, lng: () => 139.6504 } },
      ]
      callback(results, 'OK')
    });

    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }]);
    (useConfig as jest.Mock).mockReturnValue({ 
      shapeStyles: { 
        polylines: { 
          current: { strokeColor: '#82ca9d' }, 
        }, 
      }, 
    })

    const { rerender } = render(<ElevationBox />)
    
    // useEffectを再実行させるために再レンダリング
    rerender(<ElevationBox />)

    await waitFor(() => {
      expect(screen.getByTestId('elevation-box')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('line')).toBeInTheDocument()
      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  it('uses default stroke color when config is not available', async () => {
    mockElevationService.getElevationAlongPath.mockImplementation((request, callback) => {
      const results = [
        { elevation: 100, location: { lat: () => 35.6762, lng: () => 139.6503 } },
      ]
      callback(results, 'OK')
    });

    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }]);
    (useConfig as jest.Mock).mockReturnValue(null)

    const { rerender } = render(<ElevationBox />)
    rerender(<ElevationBox />)

    await waitFor(() => {
      expect(screen.getByTestId('elevation-box')).toBeInTheDocument()
    })
  })

  it('handles elevation service error gracefully', () => {
    mockElevationService.getElevationAlongPath.mockImplementation((request, callback) => {
      callback([], 'ERROR')
    });

    (useData as jest.Mock).mockReturnValue([{ current: { path: 'encodedPath' } }]);
    (useMapContext as jest.Mock).mockReturnValue([{ map: {}, elevationInfoWindow: {} }]);
    (useConfig as jest.Mock).mockReturnValue({ shapeStyles: { polylines: { current: { strokeColor: '#000000' } } } })

    const { container } = render(<ElevationBox />)
    
    // エラー時は何も表示されない
    expect(container.firstChild).toBeNull()
  })
})